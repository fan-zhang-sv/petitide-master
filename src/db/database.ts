import Dexie, { type Table } from 'dexie'
import type { AppSettings, InjectionLog, PlannedPeptide } from '../types'
import { createCompletedPastLogs } from '../utils/backfill'

export const defaultSettings: AppSettings = {
  id: 'settings',
  onboardingAccepted: false,
  preferredDoseUnit: 'mcg',
  notificationPermissionAsked: false,
  updatedAt: new Date().toISOString(),
}

class PeptidePlannerDatabase extends Dexie {
  plans!: Table<PlannedPeptide, string>
  logs!: Table<InjectionLog, string>
  settings!: Table<AppSettings, string>

  constructor() {
    super('peptide-planner')
    this.version(1).stores({
      plans: 'id, templateId, name, startDate, archived, createdAt',
      logs: 'id, planId, date, [planId+date], status, createdAt',
      settings: 'id',
    })
  }
}

export const db = new PeptidePlannerDatabase()

export async function getSettings() {
  const settings = await db.settings.get('settings')
  if (settings) {
    return settings
  }

  await db.settings.put(defaultSettings)
  return defaultSettings
}

export async function exportPlannerData() {
  const [plans, logs, settings] = await Promise.all([
    db.plans.toArray(),
    db.logs.toArray(),
    getSettings(),
  ])

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    plans,
    logs,
    settings,
  }
}

export async function importPlannerData(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Import file is not valid planner data.')
  }

  const data = payload as {
    plans?: PlannedPeptide[]
    logs?: InjectionLog[]
    settings?: AppSettings
  }

  await db.transaction('rw', db.plans, db.logs, db.settings, async () => {
    if (Array.isArray(data.plans)) {
      await db.plans.bulkPut(data.plans)
      const existingLogs = Array.isArray(data.logs) ? data.logs : []
      const currentLogs = await db.logs.toArray()
      const existingKeys = new Set(
        [...existingLogs, ...currentLogs].map((log) => `${log.planId}:${log.date}`),
      )
      const backfillLogs = data.plans.flatMap((plan) =>
        createCompletedPastLogs(plan, () => crypto.randomUUID()).filter(
          (log) => !existingKeys.has(`${log.planId}:${log.date}`),
        ),
      )
      if (backfillLogs.length > 0) {
        await db.logs.bulkPut(backfillLogs)
      }
    }
    if (Array.isArray(data.logs)) {
      await db.logs.bulkPut(data.logs)
    }
    if (data.settings?.id === 'settings') {
      await db.settings.put(data.settings)
    }
  })
}

export async function clearPlannerData() {
  await db.transaction('rw', db.plans, db.logs, db.settings, async () => {
    await db.plans.clear()
    await db.logs.clear()
    await db.settings.put({ ...defaultSettings, onboardingAccepted: true })
  })
}
