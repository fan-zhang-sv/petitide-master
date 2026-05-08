import type { AppSettings, InjectionLog, PlannedPeptide } from '../types'

export interface PlannerDataset {
  plans: PlannedPeptide[]
  logs: InjectionLog[]
  settings: AppSettings | null
}

export interface MergedPlannerData {
  plans: PlannedPeptide[]
  logs: InjectionLog[]
  settings: AppSettings
  /** Cloud log ids that should be deleted because they are duplicate planId+date entries. */
  deletedLogIds: string[]
}

const fallbackTimestamp = (record: { updatedAt?: string; createdAt?: string }) =>
  record.updatedAt ?? record.createdAt ?? ''

/**
 * Returns true when `a` should win over `b`.
 *
 * Rule: newer updatedAt wins. If timestamps tie or are missing, `b` (cloud) wins.
 */
function aWins<T extends { updatedAt?: string; createdAt?: string }>(a: T, b: T): boolean {
  const aStamp = fallbackTimestamp(a)
  const bStamp = fallbackTimestamp(b)
  if (!aStamp && !bStamp) return false
  if (!aStamp) return false
  if (!bStamp) return true
  return aStamp > bStamp
}

export function mergePlans(
  local: PlannedPeptide[],
  cloud: PlannedPeptide[],
): PlannedPeptide[] {
  const byId = new Map<string, PlannedPeptide>()
  cloud.forEach((plan) => byId.set(plan.id, plan))
  local.forEach((plan) => {
    const existing = byId.get(plan.id)
    if (!existing) {
      byId.set(plan.id, plan)
      return
    }
    if (aWins(plan, existing)) {
      byId.set(plan.id, plan)
    }
  })
  return Array.from(byId.values())
}

export function mergeLogs(
  local: InjectionLog[],
  cloud: InjectionLog[],
): { logs: InjectionLog[]; deletedCloudIds: string[] } {
  const byId = new Map<string, InjectionLog>()
  cloud.forEach((log) => byId.set(log.id, log))
  local.forEach((log) => {
    const existing = byId.get(log.id)
    if (!existing) {
      byId.set(log.id, log)
      return
    }
    if (aWins(log, existing)) {
      byId.set(log.id, log)
    }
  })

  // Collapse duplicates by planId+date — keep newest, mark losers (only cloud-originated) for deletion.
  const cloudIds = new Set(cloud.map((log) => log.id))
  const byKey = new Map<string, InjectionLog>()
  const losers: InjectionLog[] = []

  Array.from(byId.values()).forEach((log) => {
    const key = `${log.planId}:${log.date}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, log)
      return
    }
    if (aWins(log, existing)) {
      losers.push(existing)
      byKey.set(key, log)
    } else {
      losers.push(log)
    }
  })

  const deletedCloudIds = losers
    .filter((log) => cloudIds.has(log.id))
    .map((log) => log.id)

  return { logs: Array.from(byKey.values()), deletedCloudIds }
}

export function mergeSettings(
  local: AppSettings | null,
  cloud: AppSettings | null,
): AppSettings {
  const candidates = [cloud, local].filter((s): s is AppSettings => Boolean(s))
  if (candidates.length === 0) {
    return {
      id: 'settings',
      onboardingAccepted: true,
      preferredDoseUnit: 'mcg',
      notificationPermissionAsked: false,
      updatedAt: new Date().toISOString(),
    }
  }
  let winner = candidates[0]
  for (const candidate of candidates.slice(1)) {
    if (aWins(candidate, winner)) {
      winner = candidate
    }
  }
  return {
    ...winner,
    id: 'settings',
    onboardingAccepted: true,
  }
}

export function mergePlannerData(local: PlannerDataset, cloud: PlannerDataset): MergedPlannerData {
  const plans = mergePlans(local.plans, cloud.plans)
  const { logs, deletedCloudIds } = mergeLogs(local.logs, cloud.logs)
  const settings = mergeSettings(local.settings, cloud.settings)
  return { plans, logs, settings, deletedLogIds: deletedCloudIds }
}
