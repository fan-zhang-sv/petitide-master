import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import type { InjectionLog, PlannedPeptide } from '../types'
import { analyzeCycleReview } from './cycleReview'

const plan = (patch: Partial<PlannedPeptide> = {}): PlannedPeptide => ({
  id: 'plan-1',
  name: 'BPC-157',
  route: 'subcutaneous',
  dose: '250 mcg',
  frequency: { kind: 'daily' },
  startDate: '2026-05-01',
  cycleDays: 10,
  offDays: 5,
  injectionSites: ['Abdomen L'],
  createdAt: '2026-05-01T00:00:00.000Z',
  ...patch,
})

const log = (patch: Partial<InjectionLog>): InjectionLog => ({
  id: `log-${patch.date}`,
  planId: 'plan-1',
  date: '2026-05-01',
  status: 'completed',
  createdAt: '2026-05-01T12:00:00.000Z',
  ...patch,
})

describe('analyzeCycleReview', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-05'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns urgent review when side-effect notes exist', () => {
    const review = analyzeCycleReview(
      plan(),
      [log({ date: '2026-05-03', sideEffects: 'nausea' })],
      '2026-05-04',
    )

    expect(review.level).toBe('urgent-review')
    expect(review.headline).toMatch(/symptoms/i)
  })

  it('warns when history does not match off-cycle configuration', () => {
    const review = analyzeCycleReview(plan(), [log({ date: '2026-05-12' })], '2026-05-12')

    expect(review.level).toBe('review')
    expect(review.headline).toMatch(/off-cycle/i)
  })

  it('does not produce a switch recommendation while inside the tracking window', () => {
    const review = analyzeCycleReview(
      plan(),
      [log({ date: '2026-05-01' }), log({ date: '2026-05-02' })],
      '2026-05-02',
    )

    expect(review.level).toBe('clear')
    expect(review.detail).not.toMatch(/switch now|stop now|continue/i)
    expect(review.baseline?.label).toBe('Planning baseline: review off-cycle around')
    expect(review.baseline?.date).toBe('2026-05-11')
  })
})
