import { describe, expect, it } from 'vitest'
import type { PlannedPeptide } from '../types'
import {
  getAdherence,
  getCycleState,
  getDayPlanStatus,
  getEffectiveCycleAnchor,
  getNextTransitionDate,
  isDueByFrequency,
} from './cycleEngine'

const plan = (patch: Partial<PlannedPeptide> = {}): PlannedPeptide => ({
  id: 'plan-1',
  name: 'BPC-157',
  route: 'subcutaneous',
  dose: '250 mcg',
  frequency: { kind: 'daily' },
  startDate: '2026-05-01',
  cycleDays: 7,
  offDays: 3,
  injectionSites: ['Abdomen L'],
  createdAt: '2026-05-01T00:00:00.000Z',
  ...patch,
})

describe('cycle engine', () => {
  it('computes active, off, and repeated cycle states', () => {
    const subject = plan()

    expect(getCycleState(subject, '2026-04-30')).toBe('upcoming')
    expect(getCycleState(subject, '2026-05-01')).toBe('active')
    expect(getCycleState(subject, '2026-05-07')).toBe('active')
    expect(getCycleState(subject, '2026-05-08')).toBe('off')
    expect(getCycleState(subject, '2026-05-11')).toBe('active')
  })

  it('supports weekly and times-per-week schedules', () => {
    const weekly = plan({ cycleDays: undefined, offDays: undefined, frequency: { kind: 'weekly' } })
    expect(isDueByFrequency(weekly, '2026-05-08')).toBe(true)
    expect(isDueByFrequency(weekly, '2026-05-09')).toBe(false)

    const threeWeekly = plan({ frequency: { kind: 'times-per-week', timesPerWeek: 3 } })
    expect(isDueByFrequency(threeWeekly, '2026-05-01')).toBe(true)
    expect(isDueByFrequency(threeWeekly, '2026-05-03')).toBe(true)
  })

  it('marks missed and completed log states without changing the protocol', () => {
    const subject = plan()
    const missed = getDayPlanStatus(subject, [], '2026-05-02', '2026-05-03')
    expect(missed.missed).toBe(true)
    expect(missed.overdue).toBe(true)

    const completed = getDayPlanStatus(
      subject,
      [
        {
          id: 'log-1',
          planId: subject.id,
          date: '2026-05-02',
          status: 'completed',
          createdAt: '2026-05-02T12:00:00.000Z',
        },
      ],
      '2026-05-02',
      '2026-05-03',
    )
    expect(completed.completed).toBe(true)
    expect(completed.missed).toBe(false)
  })

  it('calculates adherence from past due days and logs', () => {
    const subject = plan({ cycleDays: undefined, offDays: undefined })
    const adherence = getAdherence(
      [subject],
      [
        {
          id: 'log-1',
          planId: subject.id,
          date: '2026-05-01',
          status: 'completed',
          createdAt: '2026-05-01T12:00:00.000Z',
        },
        {
          id: 'log-2',
          planId: subject.id,
          date: '2026-05-02',
          status: 'skipped',
          createdAt: '2026-05-02T12:00:00.000Z',
        },
      ],
      '2026-05-04',
    )

    expect(adherence.due).toBe(3)
    expect(adherence.completed).toBe(1)
    expect(adherence.skipped).toBe(1)
    expect(adherence.missed).toBe(1)
    expect(adherence.rate).toBe(33)
  })

  it('does not count today as missed before the user can act', () => {
    const subject = plan({ cycleDays: undefined, offDays: undefined })
    const adherence = getAdherence(
      [subject],
      [
        {
          id: 'log-1',
          planId: subject.id,
          date: '2026-05-01',
          status: 'completed',
          createdAt: '2026-05-01T12:00:00.000Z',
        },
      ],
      '2026-05-02',
    )

    expect(adherence.due).toBe(1)
    expect(adherence.completed).toBe(1)
    expect(adherence.missed).toBe(0)
    expect(adherence.rate).toBe(100)
  })

  it('does not shift the cycle dates based on completed or skipped history', () => {
    const subject = plan({ cycleDays: 7, offDays: 3 })
    const logs = [
      {
        id: 'log-1',
        planId: subject.id,
        date: '2026-05-05',
        status: 'completed' as const,
        createdAt: '2026-05-05T12:00:00.000Z',
      },
      {
        id: 'log-2',
        planId: subject.id,
        date: '2026-05-06',
        status: 'completed' as const,
        createdAt: '2026-05-06T12:00:00.000Z',
      },
    ]

    const anchor = getEffectiveCycleAnchor(subject, logs, '2026-05-06')
    expect(anchor.cycleStartDate).toBe('2026-05-01')
    expect(getNextTransitionDate(subject, '2026-05-06', logs)).toBe('2026-05-08')
    expect(getCycleState(subject, '2026-05-08', logs)).toBe('off')
  })

  it('does not shift the cycle restart dates based on skipped history', () => {
    const subject = plan({ cycleDays: 7, offDays: 3 })
    const logs = [
      {
        id: 'log-1',
        planId: subject.id,
        date: '2026-05-01',
        status: 'completed' as const,
        createdAt: '2026-05-01T12:00:00.000Z',
      },
      {
        id: 'log-2',
        planId: subject.id,
        date: '2026-05-08',
        status: 'skipped' as const,
        createdAt: '2026-05-08T12:00:00.000Z',
      },
      {
        id: 'log-3',
        planId: subject.id,
        date: '2026-05-09',
        status: 'skipped' as const,
        createdAt: '2026-05-09T12:00:00.000Z',
      },
    ]

    const anchor = getEffectiveCycleAnchor(subject, logs, '2026-05-09')
    expect(anchor.cycleStartDate).toBe('2026-05-01')
    expect(getCycleState(subject, '2026-05-09', logs)).toBe('off')
    expect(getNextTransitionDate(subject, '2026-05-09', logs)).toBe('2026-05-11')
  })

  it('preserves static cycle anchor regardless of gapped log history', () => {
    const subject = plan({ cycleDays: 7, offDays: 3 })
    const logs = [
      {
        id: 'log-1',
        planId: subject.id,
        date: '2026-05-02',
        status: 'completed' as const,
        createdAt: '2026-05-02T12:00:00.000Z',
      },
      {
        id: 'log-2',
        planId: subject.id,
        date: '2026-05-06',
        status: 'completed' as const,
        createdAt: '2026-05-06T12:00:00.000Z',
      },
    ]

    const anchor = getEffectiveCycleAnchor(subject, logs, '2026-05-06')
    expect(anchor.cycleStartDate).toBe('2026-05-01')
    expect(anchor.confidence).toBe('high')
  })
})
