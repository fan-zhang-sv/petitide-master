import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import type { AppSettings, InjectionLog, PlannedPeptide } from '../types'
import { mergePlannerData, type PlannerDataset } from './mergePlannerData'
import type { PeptidePlannerDatabase } from '../db/database'

export type MigrationPhase =
  | 'idle'
  | 'reading-local'
  | 'reading-cloud'
  | 'writing'
  | 'verifying'
  | 'clearing-local'
  | 'done'
  | 'error'

const BATCH_LIMIT = 400 // safely below Firestore's 500-write batch ceiling

export interface MigrationResult {
  plansWritten: number
  logsWritten: number
  duplicateLogsDeleted: number
  hadLocalData: boolean
}

interface MigrateArgs {
  uid: string
  firestore: Firestore
  db: PeptidePlannerDatabase
  onPhase?: (phase: MigrationPhase) => void
}

async function readLocal(db: PeptidePlannerDatabase): Promise<PlannerDataset> {
  const [plans, logs, settings] = await Promise.all([
    db.plans.toArray(),
    db.logs.toArray(),
    db.settings.get('settings'),
  ])
  return { plans, logs, settings: settings ?? null }
}

async function readCloud(firestore: Firestore, uid: string): Promise<PlannerDataset> {
  const plansSnap = await getDocs(collection(firestore, 'users', uid, 'plans'))
  const logsSnap = await getDocs(collection(firestore, 'users', uid, 'logs'))
  const settingsSnap = await getDoc(doc(firestore, 'users', uid, 'settings', 'settings'))
  return {
    plans: plansSnap.docs.map((d) => d.data() as PlannedPeptide),
    logs: logsSnap.docs.map((d) => d.data() as InjectionLog),
    settings: (settingsSnap.data() as AppSettings | undefined) ?? null,
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore) as unknown as T
  }
  if (typeof obj === 'object') {
    const cleaned = {} as Record<string, unknown>
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value)
      }
    }
    return cleaned as unknown as T
  }
  return obj
}

async function writeCloud(
  firestore: Firestore,
  uid: string,
  data: {
    plans: PlannedPeptide[]
    logs: InjectionLog[]
    settings: AppSettings
    deletedLogIds: string[]
  },
): Promise<void> {
  const plansChunks = chunk(data.plans, BATCH_LIMIT)
  for (const group of plansChunks) {
    const batch = writeBatch(firestore)
    group.forEach((plan) => {
      const ref = doc(firestore, 'users', uid, 'plans', plan.id)
      batch.set(ref, cleanForFirestore({ ...plan, schemaVersion: 1 }))
    })
    await batch.commit()
  }

  const logsChunks = chunk(data.logs, BATCH_LIMIT)
  for (const group of logsChunks) {
    const batch = writeBatch(firestore)
    group.forEach((log) => {
      const ref = doc(firestore, 'users', uid, 'logs', log.id)
      batch.set(ref, cleanForFirestore({ ...log, schemaVersion: 1 }))
    })
    await batch.commit()
  }

  const settingsBatch = writeBatch(firestore)
  settingsBatch.set(
    doc(firestore, 'users', uid, 'settings', 'settings'),
    cleanForFirestore({ ...data.settings, schemaVersion: 1 }),
  )
  settingsBatch.set(
    doc(firestore, 'users', uid, 'meta', 'migration'),
    cleanForFirestore({
      migratedAt: new Date().toISOString(),
      schemaVersion: 1,
    }),
  )
  await settingsBatch.commit()

  const deleteChunks = chunk(data.deletedLogIds, BATCH_LIMIT)
  for (const group of deleteChunks) {
    await Promise.all(
      group.map((id) => deleteDoc(doc(firestore, 'users', uid, 'logs', id))),
    )
  }
}

async function verifyCloud(
  firestore: Firestore,
  uid: string,
  expected: { plans: PlannedPeptide[]; logs: InjectionLog[]; settings: AppSettings },
): Promise<boolean> {
  const cloud = await readCloud(firestore, uid)
  const cloudPlanIds = new Set(cloud.plans.map((p) => p.id))
  const cloudLogIds = new Set(cloud.logs.map((l) => l.id))
  const everyPlan = expected.plans.every((p) => cloudPlanIds.has(p.id))
  const everyLog = expected.logs.every((l) => cloudLogIds.has(l.id))
  const settingsOk =
    cloud.settings != null && cloud.settings.onboardingAccepted === expected.settings.onboardingAccepted
  return everyPlan && everyLog && settingsOk
}

async function clearLocalPlanner(db: PeptidePlannerDatabase): Promise<void> {
  await db.transaction('rw', db.plans, db.logs, async () => {
    await db.plans.clear()
    await db.logs.clear()
  })
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message))
    }, ms)
    promise.then(
      (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

export async function migrateLocalToCloud(args: MigrateArgs): Promise<MigrationResult> {
  const { uid, firestore, db, onPhase } = args

  onPhase?.('reading-local')
  const local = await withTimeout(
    readLocal(db),
    10000,
    'Reading local database timed out. WebKit/iOS storage subsystem may be locked after redirect. Please try reloading the app.'
  )

  const hadLocalData = local.plans.length > 0 || local.logs.length > 0

  // Optimization: If local data is empty, check if the cloud is already migrated/initialized.
  // This prevents full collection scans, batch writes, and verifications on every page load.
  if (!hadLocalData) {
    try {
      const migrationSnap = await withTimeout(
        getDoc(doc(firestore, 'users', uid, 'meta', 'migration')),
        6000,
        'Checking cloud migration status timed out.'
      )
      if (migrationSnap.exists()) {
        onPhase?.('done')
        return { plansWritten: 0, logsWritten: 0, duplicateLogsDeleted: 0, hadLocalData: false }
      }
    } catch (e) {
      console.warn('Failed to quick-check cloud migration status, falling back to full flow:', e)
    }
  }

  onPhase?.('reading-cloud')
  const cloud = await withTimeout(
    readCloud(firestore, uid),
    30000,
    'Reading cloud database timed out. Please check your internet connection.'
  )

  if (!hadLocalData && cloud.plans.length === 0 && cloud.logs.length === 0 && !cloud.settings) {
    // Nothing to migrate, nothing to seed — just stamp meta and exit.
    onPhase?.('writing')
    const batch = writeBatch(firestore)
    batch.set(
      doc(firestore, 'users', uid, 'meta', 'migration'),
      cleanForFirestore({
        migratedAt: new Date().toISOString(),
        schemaVersion: 1,
      }),
    )
    if (!cloud.settings) {
      const seeded: AppSettings = {
        id: 'settings',
        onboardingAccepted: true,
        preferredDoseUnit: 'mcg',
        notificationPermissionAsked: false,
        updatedAt: new Date().toISOString(),
      }
      batch.set(
        doc(firestore, 'users', uid, 'settings', 'settings'),
        cleanForFirestore({
          ...seeded,
          schemaVersion: 1,
        }),
      )
    }
    await withTimeout(
      batch.commit(),
      30000,
      'Initializing cloud database timed out. Please check your internet connection.'
    )
    return { plansWritten: 0, logsWritten: 0, duplicateLogsDeleted: 0, hadLocalData: false }
  }

  const merged = mergePlannerData(local, cloud)

  onPhase?.('writing')
  await withTimeout(
    writeCloud(firestore, uid, merged),
    45000,
    'Uploading data to cloud timed out. Please check your internet connection.'
  )

  onPhase?.('verifying')
  const ok = await withTimeout(
    verifyCloud(firestore, uid, merged),
    30000,
    'Cloud verification timed out. Please check your internet connection.'
  )
  if (!ok) {
    throw new Error('Cloud verification failed after migration. Local data was not cleared.')
  }

  if (hadLocalData) {
    onPhase?.('clearing-local')
    await withTimeout(
      clearLocalPlanner(db),
      10000,
      'Clearing local database timed out.'
    )
  }

  return {
    plansWritten: merged.plans.length,
    logsWritten: merged.logs.length,
    duplicateLogsDeleted: merged.deletedLogIds.length,
    hadLocalData,
  }
}
