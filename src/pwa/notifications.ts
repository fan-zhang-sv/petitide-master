import type { DayPlanStatus } from '../types'
import { todayIso } from '../utils/dates'

export function notificationsSupported() {
  return 'Notification' in window
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) {
    return 'unsupported' as const
  }
  return Notification.requestPermission()
}

export function sendDueNotification(items: DayPlanStatus[]) {
  if (!notificationsSupported() || Notification.permission !== 'granted') {
    return
  }

  const today = todayIso()
  const due = items.filter((item) => item.onTrack && !item.done && item.date <= today)
  if (due.length === 0) {
    return
  }

  const title = due.length === 1 ? `${due[0].plan.name} is due` : `${due.length} injections are due`
  const body =
    due.length === 1
      ? `Planned dose: ${due[0].plan.dose || 'not set'}`
      : due.map((item) => item.plan.name).join(', ')

  new Notification(title, { body, tag: 'peptide-planner-due' })
}
