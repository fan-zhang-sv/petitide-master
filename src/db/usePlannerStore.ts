import { useCallback, useEffect, useMemo, useState } from 'react'
import { db, getSettings } from './database'
import type { AppSettings, InjectionLog, PlannedPeptide } from '../types'
import { createCompletedPastLogs } from '../utils/backfill'

const makeId = () => crypto.randomUUID()

export function usePlannerStore() {
  const [plans, setPlans] = useState<PlannedPeptide[]>([])
  const [logs, setLogs] = useState<InjectionLog[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [nextPlans, nextLogs, nextSettings] = await Promise.all([
      db.plans.orderBy('createdAt').reverse().toArray(),
      db.logs.orderBy('createdAt').reverse().toArray(),
      getSettings(),
    ])
    setPlans(nextPlans)
    setLogs(nextLogs)
    setSettings(nextSettings)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Loading IndexedDB into React state is the app's data subscription boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const activePlans = useMemo(() => plans.filter((plan) => !plan.archived), [plans])

  const acceptOnboarding = useCallback(async () => {
    const current = await getSettings()
    await db.settings.put({
      ...current,
      onboardingAccepted: true,
      updatedAt: new Date().toISOString(),
    })
    await refresh()
  }, [refresh])

  const saveSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const current = await getSettings()
      await db.settings.put({
        ...current,
        ...patch,
        id: 'settings',
        updatedAt: new Date().toISOString(),
      })
      await refresh()
    },
    [refresh],
  )

  const addPlan = useCallback(
    async (plan: Omit<PlannedPeptide, 'id' | 'createdAt'>) => {
      const nextPlan: PlannedPeptide = {
        ...plan,
        id: makeId(),
        createdAt: new Date().toISOString(),
      }
      await db.transaction('rw', db.plans, db.logs, async () => {
        await db.plans.put(nextPlan)
        const backfillLogs = createCompletedPastLogs(nextPlan, makeId)
        if (backfillLogs.length > 0) {
          await db.logs.bulkPut(backfillLogs)
        }
      })
      await refresh()
      return nextPlan
    },
    [refresh],
  )

  const updatePlan = useCallback(
    async (id: string, patch: Partial<PlannedPeptide>) => {
      await db.transaction('rw', db.plans, db.logs, async () => {
        const existingPlan = await db.plans.get(id)
        if (!existingPlan) {
          return
        }
        const nextPlan = { ...existingPlan, ...patch }
        await db.plans.put(nextPlan)
        const existingLogs = await db.logs.where({ planId: id }).toArray()
        const existingKeys = new Set(existingLogs.map((log) => `${log.planId}:${log.date}`))
        const backfillLogs = createCompletedPastLogs(nextPlan, makeId).filter(
          (log) => !existingKeys.has(`${log.planId}:${log.date}`),
        )
        if (backfillLogs.length > 0) {
          await db.logs.bulkPut(backfillLogs)
        }
      })
      await refresh()
    },
    [refresh],
  )

  const archivePlan = useCallback(
    async (id: string) => {
      await db.plans.update(id, { archived: true })
      await refresh()
    },
    [refresh],
  )

  const addLog = useCallback(
    async (log: Omit<InjectionLog, 'id' | 'createdAt'>) => {
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
        createdAt: new Date().toISOString(),
      })
      await refresh()
    },
    [refresh],
  )

  return {
    loading,
    plans,
    activePlans,
    logs,
    settings,
    refresh,
    acceptOnboarding,
    saveSettings,
    addPlan,
    updatePlan,
    archivePlan,
    addLog,
  }
}
