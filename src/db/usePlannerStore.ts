import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppSettings, InjectionLog, PlannedPeptide } from '../types'
import { useAuth } from '../auth/AuthContext'
import { firestore } from '../lib/firebase'
import { LocalRepository } from '../sync/localRepository'
import { RemoteRepository } from '../sync/remoteRepository'
import type { PlannerRepository, PlannerSnapshot } from '../sync/repository'

export function usePlannerStore() {
  const { user, authLoading, migration } = useAuth()
  const [snapshot, setSnapshot] = useState<PlannerSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [repository, setRepository] = useState<PlannerRepository | null>(null)

  // Wait for migration to complete before swapping to the remote repo so that
  // local Dexie data remains the source of truth during the migration window.
  const ready = !authLoading && (
    !user || migration.phase === 'done' || migration.phase === 'error' || !firestore
  )

  // Manage repository lifecycle.
  // We use an effect to avoid accessing refs or creating side-effectful classes during render.
  useEffect(() => {
    if (!ready) {
      return
    }

    const nextRepository = (user && firestore && migration.phase === 'done')
      ? new RemoteRepository(firestore, user.uid)
      : new LocalRepository()
    
    queueMicrotask(() => setRepository(nextRepository))

    return () => {
      if (nextRepository instanceof RemoteRepository) {
        nextRepository.dispose()
      }
    }
  }, [user, migration.phase, ready])

  // Manage subscription lifecycle.
  useEffect(() => {
    if (!repository) {
      return
    }

    // Since we are starting a new subscription, we are technically loading.
    // We defer this to the next tick if needed, but here we can just let the subscribe callback handle it.
    const unsubscribe = repository.subscribe((next) => {
      setSnapshot(next)
      setLoading(false)
    })

    return () => {
      unsubscribe()
      // Reset loading for the next repository swap
      setLoading(true)
    }
  }, [repository])

  const refresh = useCallback(async () => {
    if (!repository) return
    const next = await repository.load()
    setSnapshot(next)
    setLoading(false)
  }, [repository])

  const acceptOnboarding = useCallback(async () => {
    if (!repository) return
    await repository.acceptOnboarding()
  }, [repository])

  const saveSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      if (!repository) return
      await repository.saveSettings(patch)
    },
    [repository],
  )

  const addPlan = useCallback(
    async (plan: Omit<PlannedPeptide, 'id' | 'createdAt'>) => {
      if (!repository) {
        throw new Error('Planner storage is not ready yet.')
      }
      return repository.addPlan(plan)
    },
    [repository],
  )

  const updatePlan = useCallback(
    async (id: string, patch: Partial<PlannedPeptide>) => {
      if (!repository) return
      await repository.updatePlan(id, patch)
    },
    [repository],
  )

  const archivePlan = useCallback(
    async (id: string) => {
      if (!repository) return
      await repository.archivePlan(id)
    },
    [repository],
  )

  const addLog = useCallback(
    async (log: Omit<InjectionLog, 'id' | 'createdAt'>) => {
      if (!repository) return
      await repository.addLog(log)
    },
    [repository],
  )

  const deleteLog = useCallback(
    async (planId: string, date: string) => {
      if (!repository) return
      await repository.deleteLog(planId, date)
    },
    [repository],
  )

  // Use stable references for snapshot data to avoid excessive re-renders of downstream effects.
  const plans = useMemo(() => snapshot?.plans ?? [], [snapshot?.plans])
  const logs = useMemo(() => snapshot?.logs ?? [], [snapshot?.logs])
  const settings = snapshot?.settings ?? null
  
  const activePlans = useMemo(() => plans.filter((plan) => !plan.archived), [plans])

  return {
    loading: loading || !ready,
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
    deleteLog,
  }
}
