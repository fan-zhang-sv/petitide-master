import { db, getSettings } from '../db/database'
import type { AppSettings, InjectionLog, PlannedPeptide } from '../types'
import { createCompletedPastLogs } from '../utils/backfill'
import type { PlannerRepository, PlannerSnapshot } from './repository'

const makeId = () => crypto.randomUUID()

export class LocalRepository implements PlannerRepository {
  private listeners = new Set<(snapshot: PlannerSnapshot) => void>()

  subscribe(listener: (snapshot: PlannerSnapshot) => void): () => void {
    this.listeners.add(listener)
    void this.load().then(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async load(): Promise<PlannerSnapshot> {
    const [plans, logs, settings] = await Promise.all([
      db.plans.orderBy('createdAt').reverse().toArray(),
      db.logs.orderBy('createdAt').reverse().toArray(),
      getSettings(),
    ])
    return { plans, logs, settings }
  }

  private async notify() {
    if (this.listeners.size === 0) {
      return
    }
    const snapshot = await this.load()
    this.listeners.forEach((listener) => listener(snapshot))
  }

  async acceptOnboarding(): Promise<void> {
    const current = await getSettings()
    await db.settings.put({
      ...current,
      onboardingAccepted: true,
      updatedAt: new Date().toISOString(),
    })
    await this.notify()
  }

  async saveSettings(patch: Partial<AppSettings>): Promise<void> {
    const current = await getSettings()
    await db.settings.put({
      ...current,
      ...patch,
      id: 'settings',
      updatedAt: new Date().toISOString(),
    })
    await this.notify()
  }

  async addPlan(plan: Omit<PlannedPeptide, 'id' | 'createdAt'>): Promise<PlannedPeptide> {
    const now = new Date().toISOString()
    const nextPlan: PlannedPeptide = {
      ...plan,
      id: makeId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.transaction('rw', db.plans, db.logs, async () => {
      await db.plans.put(nextPlan)
      const backfillLogs = createCompletedPastLogs(nextPlan, makeId).map((log) => ({
        ...log,
        updatedAt: now,
      }))
      if (backfillLogs.length > 0) {
        await db.logs.bulkPut(backfillLogs)
      }
    })
    await this.notify()
    return nextPlan
  }

  async updatePlan(id: string, patch: Partial<PlannedPeptide>): Promise<void> {
    const now = new Date().toISOString()
    await db.transaction('rw', db.plans, db.logs, async () => {
      const existingPlan = await db.plans.get(id)
      if (!existingPlan) {
        return
      }
      const nextPlan: PlannedPeptide = { ...existingPlan, ...patch, updatedAt: now }
      await db.plans.put(nextPlan)
      const existingLogs = await db.logs.where({ planId: id }).toArray()
      const existingKeys = new Set(existingLogs.map((log) => `${log.planId}:${log.date}`))
      const backfillLogs = createCompletedPastLogs(nextPlan, makeId)
        .filter((log) => !existingKeys.has(`${log.planId}:${log.date}`))
        .map((log) => ({ ...log, updatedAt: now }))
      if (backfillLogs.length > 0) {
        await db.logs.bulkPut(backfillLogs)
      }
    })
    await this.notify()
  }

  async archivePlan(id: string): Promise<void> {
    const now = new Date().toISOString()
    await db.plans.update(id, { archived: true, updatedAt: now })
    await this.notify()
  }

  async addLog(log: Omit<InjectionLog, 'id' | 'createdAt'>): Promise<void> {
    const now = new Date().toISOString()
    await db.logs
      .where('[planId+date]')
      .equals([log.planId, log.date])
      .delete()
      .catch(async () => {
        const duplicates = await db.logs.where({ planId: log.planId, date: log.date }).toArray()
        await db.logs.bulkDelete(duplicates.map((duplicate) => duplicate.id))
      })

    await db.logs.put({
      ...log,
      id: makeId(),
      createdAt: now,
      updatedAt: now,
    })
    await this.notify()
  }
}
