import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore'
import type { AppSettings, InjectionLog, PlannedPeptide } from '../types'
import { defaultSettings } from '../db/database'
import { createCompletedPastLogs } from '../utils/backfill'
import type { PlannerRepository, PlannerSnapshot } from './repository'

const makeId = () => crypto.randomUUID()

interface RemoteDocBase {
  schemaVersion: number
  updatedAt: string
}

export class RemoteRepository implements PlannerRepository {
  private listeners = new Set<(snapshot: PlannerSnapshot) => void>()
  private plans: PlannedPeptide[] = []
  private logs: InjectionLog[] = []
  private settings: AppSettings = { ...defaultSettings, onboardingAccepted: true }
  private hasPlans = false
  private hasLogs = false
  private hasSettings = false
  private snapshotUnsubscribers: Array<() => void> = []
  private readonly firestore: Firestore
  private readonly uid: string

  constructor(firestore: Firestore, uid: string) {
    this.firestore = firestore
    this.uid = uid
    this.startListeners()
  }

  private userDoc(...path: string[]) {
    return doc(this.firestore, 'users', this.uid, ...path)
  }

  private userCollection(name: string) {
    return collection(this.firestore, 'users', this.uid, name)
  }

  private startListeners() {
    const plansUnsub = onSnapshot(this.userCollection('plans'), (snap) => {
      this.plans = snap.docs
        .map((d) => d.data() as PlannedPeptide)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      this.hasPlans = true
      this.maybeEmit()
    })
    const logsUnsub = onSnapshot(this.userCollection('logs'), (snap) => {
      this.logs = snap.docs
        .map((d) => d.data() as InjectionLog)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      this.hasLogs = true
      this.maybeEmit()
    })
    const settingsUnsub = onSnapshot(this.userDoc('settings', 'settings'), (snap) => {
      const data = snap.data() as AppSettings | undefined
      this.settings = data
        ? { ...data, id: 'settings' }
        : { ...defaultSettings, onboardingAccepted: true, updatedAt: new Date().toISOString() }
      this.hasSettings = true
      this.maybeEmit()
    })
    this.snapshotUnsubscribers.push(plansUnsub, logsUnsub, settingsUnsub)
  }

  private maybeEmit() {
    if (!this.hasPlans || !this.hasLogs || !this.hasSettings) {
      return
    }
    const snapshot: PlannerSnapshot = {
      plans: this.plans,
      logs: this.logs,
      settings: this.settings,
    }
    this.listeners.forEach((listener) => listener(snapshot))
  }

  dispose() {
    this.snapshotUnsubscribers.forEach((fn) => fn())
    this.snapshotUnsubscribers = []
    this.listeners.clear()
  }

  subscribe(listener: (snapshot: PlannerSnapshot) => void): () => void {
    this.listeners.add(listener)
    if (this.hasPlans && this.hasLogs && this.hasSettings) {
      listener({ plans: this.plans, logs: this.logs, settings: this.settings })
    }
    return () => {
      this.listeners.delete(listener)
    }
  }

  async load(): Promise<PlannerSnapshot> {
    const [plansSnap, logsSnap, settingsSnap] = await Promise.all([
      getDocs(this.userCollection('plans')),
      getDocs(this.userCollection('logs')),
      getDoc(this.userDoc('settings', 'settings')),
    ])
    const plans = plansSnap.docs
      .map((d) => d.data() as PlannedPeptide)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    const logs = logsSnap.docs
      .map((d) => d.data() as InjectionLog)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    const settingsData = settingsSnap.data() as AppSettings | undefined
    const settings: AppSettings = settingsData
      ? { ...settingsData, id: 'settings' }
      : {
          ...defaultSettings,
          onboardingAccepted: true,
          updatedAt: new Date().toISOString(),
        }
    return { plans, logs, settings }
  }

  async acceptOnboarding(): Promise<void> {
    await this.saveSettings({ onboardingAccepted: true })
  }

  async saveSettings(patch: Partial<AppSettings>): Promise<void> {
    const current = (await getDoc(this.userDoc('settings', 'settings'))).data() as
      | AppSettings
      | undefined
    const next: AppSettings & RemoteDocBase = {
      ...defaultSettings,
      ...current,
      ...patch,
      id: 'settings',
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    }
    await setDoc(this.userDoc('settings', 'settings'), next)
  }

  async addPlan(plan: Omit<PlannedPeptide, 'id' | 'createdAt'>): Promise<PlannedPeptide> {
    const now = new Date().toISOString()
    const nextPlan: PlannedPeptide = {
      ...plan,
      id: makeId(),
      createdAt: now,
      updatedAt: now,
    }
    await setDoc(this.userDoc('plans', nextPlan.id), {
      ...nextPlan,
      schemaVersion: 1,
    })
    const backfillLogs = createCompletedPastLogs(nextPlan, makeId).map((log) => ({
      ...log,
      updatedAt: now,
    }))
    await Promise.all(
      backfillLogs.map((log) =>
        setDoc(this.userDoc('logs', log.id), { ...log, schemaVersion: 1 }),
      ),
    )
    return nextPlan
  }

  async updatePlan(id: string, patch: Partial<PlannedPeptide>): Promise<void> {
    const now = new Date().toISOString()
    const existingSnap = await getDoc(this.userDoc('plans', id))
    const existing = existingSnap.data() as PlannedPeptide | undefined
    if (!existing) {
      return
    }
    const nextPlan: PlannedPeptide = { ...existing, ...patch, updatedAt: now }
    await setDoc(this.userDoc('plans', id), { ...nextPlan, schemaVersion: 1 })

    const existingLogsSnap = await getDocs(
      query(this.userCollection('logs'), where('planId', '==', id)),
    )
    const existingKeys = new Set(
      existingLogsSnap.docs.map((d) => {
        const data = d.data() as InjectionLog
        return `${data.planId}:${data.date}`
      }),
    )
    const backfillLogs = createCompletedPastLogs(nextPlan, makeId)
      .filter((log) => !existingKeys.has(`${log.planId}:${log.date}`))
      .map((log) => ({ ...log, updatedAt: now }))
    await Promise.all(
      backfillLogs.map((log) =>
        setDoc(this.userDoc('logs', log.id), { ...log, schemaVersion: 1 }),
      ),
    )
  }

  async archivePlan(id: string): Promise<void> {
    const existingSnap = await getDoc(this.userDoc('plans', id))
    const existing = existingSnap.data() as PlannedPeptide | undefined
    if (!existing) {
      return
    }
    const now = new Date().toISOString()
    await setDoc(this.userDoc('plans', id), {
      ...existing,
      archived: true,
      updatedAt: now,
      schemaVersion: 1,
    })
  }

  async addLog(log: Omit<InjectionLog, 'id' | 'createdAt'>): Promise<void> {
    const dupSnap = await getDocs(
      query(
        this.userCollection('logs'),
        where('planId', '==', log.planId),
        where('date', '==', log.date),
      ),
    )
    await Promise.all(dupSnap.docs.map((d) => deleteDoc(d.ref)))

    const now = new Date().toISOString()
    const nextLog: InjectionLog = {
      ...log,
      id: makeId(),
      createdAt: now,
      updatedAt: now,
    }
    await setDoc(this.userDoc('logs', nextLog.id), { ...nextLog, schemaVersion: 1 })
  }
}
