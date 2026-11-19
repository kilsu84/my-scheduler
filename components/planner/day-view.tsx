'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { addDays, dayKey, formatFullDate, startOfDay } from '@/lib/date-utils'
import { useSchedules, useTodosInRange } from '@/hooks/use-planner-data'
import { PeriodNav } from './period-nav'
import { ScheduleItem } from './schedule-item'
import { StatsBar } from './stats-bar'

export function DayView({
  anchor,
  onAnchorChange,
  now,
}: {
  anchor: Date
  onAnchorChange: (d: Date) => void
  now: Date
}) {
  const dayStart = useMemo(() => startOfDay(anchor), [anchor])
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart])
  const key = dayKey(dayStart)

  const { data: schedules, isLoading } = useSchedules(dayStart, dayEnd)
  const { data: todos } = useTodosInRange(key, key)

  return (
    <section aria-label="일간 일정" className="flex flex-col gap-4">
      <PeriodNav
        label={formatFullDate(dayStart)}
        onPrev={() => onAnchorChange(addDays(dayStart, -1))}
        onNext={() => onAnchorChange(addDays(dayStart, 1))}
        onToday={() => onAnchorChange(new Date(now))}
        todayLabel="오늘"
      />

      <StatsBar schedules={schedules ?? []} periodLabel="일간" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-2 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-lg font-bold">상세 일정</h2>
            <span className="text-sm text-muted-foreground tabular-nums">{schedules?.length ?? 0}건</span>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중…</p>
          ) : schedules?.length ? (
            <ul className="flex flex-col divide-y">
              {schedules.map((s) => (
                <ScheduleItem key={s.id} schedule={s} />
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">이 날은 예정된 일정이 없습니다.</p>
          )}
        </div>

        <aside className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm lg:self-start">
          <h2 className="font-serif text-lg font-bold">이 날의 할 일</h2>
          {todos?.length ? (
            <ul className="flex flex-col gap-2">
              {todos.map((t) => (
                <li key={t.id} className={cn('text-sm', t.done && 'text-muted-foreground line-through')}>
                  {t.done ? '✓' : '·'} {t.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">등록된 할 일이 없습니다.</p>
          )}
        </aside>
      </div>
    </section>
  )
}
