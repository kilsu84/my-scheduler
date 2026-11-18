'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { formatTime } from '@/lib/date-utils'
import type { ScheduleDTO } from '@/app/actions/schedules'

const LEAD_MINUTES = [30, 10, 0]

/** Raises in-app (and, when permitted, system) reminders while the app is open. */
export function ReminderWatcher({ schedules }: { schedules: ScheduleDTO[] | undefined }) {
  const notified = useRef(new Set<string>())

  useEffect(() => {
    if (!schedules?.length) return

    function check() {
      const now = Date.now()
      for (const s of schedules!) {
        if (s.allDay || s.done) continue
        const start = new Date(s.startAt).getTime()
        for (const lead of LEAD_MINUTES) {
          const fireAt = start - lead * 60_000
          const key = `${s.id}:${lead}`
          if (now >= fireAt && now < fireAt + 60_000 && !notified.current.has(key)) {
            notified.current.add(key)
            const label = lead === 0 ? '지금 시작' : `${lead}분 후`
            const body = `${formatTime(new Date(s.startAt))} · ${s.customerName ? `${s.customerName} ` : ''}${s.title}`
            toast.info(`${label} 일정`, { description: body, duration: 15_000 })
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`나의 비서 · ${label}`, { body })
            }
          }
        }
      }
    }

    check()
    const id = window.setInterval(check, 20_000)
    return () => window.clearInterval(id)
  }, [schedules])

  return null
}
