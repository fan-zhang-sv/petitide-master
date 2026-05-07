import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  parseISO,
  startOfMonth,
  startOfDay,
  startOfWeek,
} from 'date-fns'

export const todayIso = () => format(new Date(), 'yyyy-MM-dd')

export const toIsoDate = (date: Date) => format(date, 'yyyy-MM-dd')

export const parseDate = (date: string) => startOfDay(parseISO(date))

export const daysBetween = (start: string, end: string) =>
  differenceInCalendarDays(parseDate(end), parseDate(start))

export const addIsoDays = (date: string, days: number) => toIsoDate(addDays(parseDate(date), days))

export const isPastDate = (date: string, today = todayIso()) =>
  isBefore(parseDate(date), parseDate(today))

export const toMonthKey = (date = todayIso()) => format(parseDate(date), 'yyyy-MM')

export const monthStartIso = (monthKey: string) => toIsoDate(startOfMonth(parseDate(`${monthKey}-01`)))

export const monthEndIso = (monthKey: string) => toIsoDate(endOfMonth(parseDate(`${monthKey}-01`)))

export const monthLabel = (monthKey: string) => format(parseDate(`${monthKey}-01`), 'MMMM yyyy')

export const nextMonthKey = (monthKey: string) => format(addMonths(parseDate(`${monthKey}-01`), 1), 'yyyy-MM')

export const previousMonthKey = (monthKey: string) => format(addMonths(parseDate(`${monthKey}-01`), -1), 'yyyy-MM')

export const getPaddedMonthDates = (monthKey: string) => {
  const monthDate = parseDate(`${monthKey}-01`)
  const start = startOfWeek(startOfMonth(monthDate))
  const end = endOfWeek(endOfMonth(monthDate))
  const totalDays = differenceInCalendarDays(end, start) + 1

  return Array.from({ length: totalDays }, (_, index) => toIsoDate(addDays(start, index)))
}
