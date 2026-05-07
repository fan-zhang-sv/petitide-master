import { describe, expect, it } from 'vitest'
import {
  getPaddedMonthDates,
  monthEndIso,
  monthLabel,
  monthStartIso,
  nextMonthKey,
  previousMonthKey,
} from './dates'

describe('date month helpers', () => {
  it('builds padded month grids across full weeks', () => {
    const dates = getPaddedMonthDates('2026-05')

    expect(dates[0]).toBe('2026-04-26')
    expect(dates.at(-1)).toBe('2026-06-06')
    expect(dates).toHaveLength(42)
    expect(dates).toContain('2026-05-01')
    expect(dates).toContain('2026-05-31')
  })

  it('handles month labels and boundaries', () => {
    expect(monthLabel('2026-05')).toBe('May 2026')
    expect(monthStartIso('2026-05')).toBe('2026-05-01')
    expect(monthEndIso('2026-05')).toBe('2026-05-31')
  })

  it('navigates across year boundaries', () => {
    expect(previousMonthKey('2026-01')).toBe('2025-12')
    expect(nextMonthKey('2026-12')).toBe('2027-01')
  })
})
