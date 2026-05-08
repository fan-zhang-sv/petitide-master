import { describe, expect, it } from 'vitest'
import { mergePlannerData } from './mergePlannerData'
import type { AppSettings, InjectionLog, PlannedPeptide } from '../types'

const plan = (overrides: Partial<PlannedPeptide>): PlannedPeptide => ({
  id: overrides.id ?? 'plan-1',
  templateId: overrides.templateId,
  name: overrides.name ?? 'Test plan',
  route: overrides.route ?? 'subcutaneous',
  dose: overrides.dose ?? '250mcg',
  frequency: overrides.frequency ?? { kind: 'daily' },
  startDate: overrides.startDate ?? '2026-01-01',
  injectionSites: overrides.injectionSites ?? [],
  notes: overrides.notes,
  cycleDays: overrides.cycleDays,
  offDays: overrides.offDays,
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt,
  archived: overrides.archived,
})

const log = (overrides: Partial<InjectionLog>): InjectionLog => ({
  id: overrides.id ?? 'log-1',
  planId: overrides.planId ?? 'plan-1',
  date: overrides.date ?? '2026-01-01',
  status: overrides.status ?? 'completed',
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt,
})

const settings = (overrides: Partial<AppSettings>): AppSettings => ({
  id: 'settings',
  onboardingAccepted: overrides.onboardingAccepted ?? true,
  preferredDoseUnit: overrides.preferredDoseUnit ?? 'mcg',
  notificationPermissionAsked: overrides.notificationPermissionAsked ?? false,
  updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
})

describe('mergePlannerData', () => {
  it('takes all local data when cloud is empty', () => {
    const local = {
      plans: [plan({ id: 'a' }), plan({ id: 'b' })],
      logs: [log({ id: 'l1' }), log({ id: 'l2', date: '2026-01-02' })],
      settings: settings({}),
    }
    const cloud = { plans: [], logs: [], settings: null }
    const merged = mergePlannerData(local, cloud)
    expect(merged.plans).toHaveLength(2)
    expect(merged.logs).toHaveLength(2)
    expect(merged.settings.onboardingAccepted).toBe(true)
    expect(merged.deletedLogIds).toHaveLength(0)
  })

  it('merges disjoint cloud and local data without dropping either', () => {
    const local = {
      plans: [plan({ id: 'a' })],
      logs: [log({ id: 'l1', planId: 'a' })],
      settings: settings({}),
    }
    const cloud = {
      plans: [plan({ id: 'b' })],
      logs: [log({ id: 'l2', planId: 'b', date: '2026-02-01' })],
      settings: settings({}),
    }
    const merged = mergePlannerData(local, cloud)
    expect(merged.plans.map((p) => p.id).sort()).toEqual(['a', 'b'])
    expect(merged.logs.map((l) => l.id).sort()).toEqual(['l1', 'l2'])
  })

  it('keeps the newest record on same-id conflict', () => {
    const local = {
      plans: [plan({ id: 'a', name: 'local-newer', updatedAt: '2026-03-01T00:00:00.000Z' })],
      logs: [],
      settings: null,
    }
    const cloud = {
      plans: [plan({ id: 'a', name: 'cloud-older', updatedAt: '2026-02-01T00:00:00.000Z' })],
      logs: [],
      settings: null,
    }
    const merged = mergePlannerData(local, cloud)
    expect(merged.plans[0].name).toBe('local-newer')
  })

  it('keeps cloud when timestamps tie or are missing', () => {
    const local = {
      plans: [plan({ id: 'a', name: 'local' })],
      logs: [],
      settings: null,
    }
    const cloud = {
      plans: [plan({ id: 'a', name: 'cloud' })],
      logs: [],
      settings: null,
    }
    const merged = mergePlannerData(local, cloud)
    expect(merged.plans[0].name).toBe('cloud')
  })

  it('collapses duplicate planId+date logs to the newest record', () => {
    const local = {
      plans: [],
      logs: [
        log({
          id: 'local-log',
          planId: 'p1',
          date: '2026-01-05',
          updatedAt: '2026-01-06T00:00:00.000Z',
        }),
      ],
      settings: null,
    }
    const cloud = {
      plans: [],
      logs: [
        log({
          id: 'cloud-log',
          planId: 'p1',
          date: '2026-01-05',
          updatedAt: '2026-01-05T00:00:00.000Z',
        }),
      ],
      settings: null,
    }
    const merged = mergePlannerData(local, cloud)
    expect(merged.logs).toHaveLength(1)
    expect(merged.logs[0].id).toBe('local-log')
    expect(merged.deletedLogIds).toEqual(['cloud-log'])
  })

  it('forces settings.id and onboardingAccepted while picking newest updatedAt', () => {
    const local = {
      plans: [],
      logs: [],
      settings: settings({
        onboardingAccepted: false,
        preferredDoseUnit: 'mg',
        updatedAt: '2026-04-01T00:00:00.000Z',
      }),
    }
    const cloud = {
      plans: [],
      logs: [],
      settings: settings({
        onboardingAccepted: false,
        preferredDoseUnit: 'IU',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    }
    const merged = mergePlannerData(local, cloud)
    expect(merged.settings.id).toBe('settings')
    expect(merged.settings.onboardingAccepted).toBe(true)
    expect(merged.settings.preferredDoseUnit).toBe('mg')
  })
})
