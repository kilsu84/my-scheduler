'use client'

import { useMemo } from 'react'
import { BellRing } from 'lucide-react'
import { ScheduleComposer } from './schedule-composer'
import { ScheduleItem } from './schedule-item'
import { TodoPanel } from './todo-panel'
import { GoogleConnect } from './google-connect'
import { ReminderWatcher } from './reminder-watcher'
import { useSchedules } from '@/hooks/use-planner-data'
import { addDays, dayKey, formatShortDate, relativeDayLabel, startOfDay } from '@/lib/date-utils'
import type { ScheduleDTO } from '@/app/actions/schedules'

function groupByDay(items: ScheduleDTO[]) {
  const map = new Map<string, ScheduleDTO[]>()
  for (const s of items) {
    const key = dayKey(new Date(s.startAt))
    map.set(key, [...(map.get(key) ?? []), s])
  }
  return [...map.entries()]
}

export function TodayView({ now, selectedCategory }: { now: Date; selectedCategory: string | null }) {
  const today = useMemo(() => startOfDay(now), [now])
  const tomorrow = useMemo(() => addDays(today, 1), [today])
  const weekAhead = useMemo(() => addDays(today, 8), [today])

  const { data: rawTodaySchedules, isLoading } = useSchedules(today, tomorrow)
  const { data: rawUpcoming } = useSchedules(tomorrow, weekAhead)

  const todaySchedules = useMemo(() => {
    if (!rawTodaySchedules) return []
    if (!selectedCategory) return rawTodaySchedules
    return rawTodaySchedules.filter((s) => s.categories.includes(selectedCategory))
  }, [rawTodaySchedules, selectedCategory])

  const upcoming = useMemo(() => {
    if (!rawUpcoming) return []
    if (!selectedCategory) return rawUpcoming
    return rawUpcoming.filter((s) => s.categories.includes(selectedCategory))
  }, [rawUpcoming, selectedCategory])

  const nextUp = todaySchedules.find((s) => !s.done && !s.allDay && new Date(s.startAt).getTime() > now.getTime())

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <ReminderWatcher schedules={rawTodaySchedules} />
      <div className="flex min-w-0 flex-col gap-6">
        <ScheduleComposer />

        <section aria-labelledby="today-schedule-title" className="flex flex-col gap-2 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 id="today-schedule-title" className="font-serif text-lg font-bold">
              오늘 일정
            </h2>
            <span className="text-sm text-muted-foreground tabular-nums">{todaySchedules.length}건</span>
          </div>
          {nextUp && (
            <p className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
              <BellRing className="size-4 shrink-0 text-gold" aria-hidden="true" />
              <span className="truncate">
                다음 일정 ·{' '}
                {new Date(nextUp.startAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}{' '}
                {nextUp.customerName ? `${nextUp.customerName} ` : ''}
                {nextUp.title}
              </span>
            </p>
          )}
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중…</p>
          ) : todaySchedules.length ? (
            <ul className="flex flex-col divide-y">
              {todaySchedules.map((s) => (
                <ScheduleItem key={s.id} schedule={s} />
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {selectedCategory ? '선택한 카테고리의 오늘 일정이 없습니다.' : '오늘은 예정된 일정이 없습니다.'}
            </p>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-6" aria-label="브리핑">
        <GoogleConnect />
        <TodoPanel today={dayKey(today)} />

        <section aria-labelledby="upcoming-title" className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
          <h2 id="upcoming-title" className="font-serif text-lg font-bold">
            다가오는 7일
          </h2>
          {upcoming.length ? (
            <div className="flex flex-col gap-4">
              {groupByDay(upcoming).map(([key, items]) => {
                const date = new Date(items[0].startAt)
                return (
                  <div key={key} className="flex flex-col">
                    <p className="text-xs font-semibold text-muted-foreground">
                      <span className="text-gold-foreground">{relativeDayLabel(date, now)}</span> · {formatShortDate(date)}
                    </p>
                    <ul className="flex flex-col divide-y">
                      {items.map((s) => (
                        <ScheduleItem key={s.id} schedule={s} />
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {selectedCategory ? '선택한 카테고리의 예정된 일정이 없습니다.' : '이번 주 예정된 일정이 없습니다.'}
            </p>
          )}
        </section>
      </aside>
    </div>
  )
}
