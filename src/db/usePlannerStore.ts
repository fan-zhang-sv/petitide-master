import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppSettings, InjectionLog, PlannedPeptide } from '../types'
import { useAuth } from '../auth/AuthProvider'
import { firestore } from '../lib/firebase'
import { LocalRepository } from '../sync/localRepository'
import { RemoteRepository } from '../sync/remoteRepository'
import type { PlannerRepository, PlannerSnapshot } from '../sync/repository'

export function usePlannerStore() {
  const { user, authLoading, migration } = useAuth()
  const [snapshot, setSnapshot] = useState<PlannerSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const repositoryRef = useRef<PlannerRepository | null>(null)

  // Wait for migration to complete before swapping to the remote repo so that
  // local Dexie data remains the source of truth during the migration window.
  const ready = !authLoading && (
    !user || migration.phase === 'done' || migration.phase === 'error' || !firestore
  )

  const repository = useMemo<PlannerRepository | null>(() => {
    if (!ready) {
      return repositoryRef.current
    }
    if (user && firestore && migration.phase === 'done') {
      return new RemoteRepository(firestore, user.uid)
    }
    return new LocalRepository()
    // We intentionally re-create on user/migration changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, migration.phase, ready])

  useEffect(() => {
    if (!repository) {
      return
    }
    const previous = repositoryRef.current
    if (previous && previous !== repository && previous instanceof RemoteRepository) {
      previous.dispose()
    }
    repositoryRef.current = repository

    setLoading(true)
    const unsubscribe = repository.subscribe((next) => {
      setSnapshot(next)
      setLoading(false)
    })
    return () => {
      unsubscribe()
    }
  }, [repository])

  useEffect(() => {
    return () => {
      const current = repositoryRef.current
      if (current instanceof RemoteRepository) {
        current.dispose()
      }
    }
  }, [])

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

  const plans = snapshot?.plans ?? []
  const logs = snapshot?.logs ?? []
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
  }
}
