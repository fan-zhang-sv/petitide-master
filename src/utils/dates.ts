import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns'

export const todayIso = () => format(new Date(), 'yyyy-MM-dd')

export const toIsoDate = (date: Date) => format(date, 'yyyy-MM-dd')

export const parseDate = (date: string) => startOfDay(parseISO(date))

export const daysBetween = (start: string, end: string) =>
  differenceInCalendarDays(parseDate(end), parseDate(start))

export const addIsoDays = (date: string, days: number) => toIsoDate(addDays(parseDate(date), days))

export const isPastDate = (date: string, today = todayIso()) =>
  isBefore(parseDate(date), parseDate(today))
