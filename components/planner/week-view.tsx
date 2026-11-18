'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { addDays, dayKey, formatTime, isSameDay, startOfWeek } from '@/lib/date-utils'
import { useSchedules, useTodosInRange } from '@/hooks/use-planner-data'
import { CategoryBadges } from './category-badges'
import { PeriodNav } from './period-nav'

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export function WeekView({ anchor, onAnchorChange, now }: { anchor: Date; onAnchorChange: (d: Date) => void; now: Date }) {
  const weekStart = useMemo(() => startOfWeek(anchor), [anchor])
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const { data: schedules } = useSchedules(weekStart, weekEnd)
  const { data: todos } = useTodosInRange(dayKey(weekStart), dayKey(addDays(weekStart, 6)))

  const label = `${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 – ${addDays(weekStart, 6).getMonth() + 1}월 ${addDays(weekStart, 6).getDate()}일`

  return (
    <section aria-label="주간 일정" className="flex flex-col gap-4">
      <PeriodNav
        label={label}
        onPrev={() => onAnchorChange(addDays(anchor, -7))}
        onNext={() => onAnchorChange(addDays(anchor, 7))}
        onToday={() => onAnchorChange(new Date())}
        todayLabel="이번 주"
      />
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day, i) => {
          const key = dayKey(day)
          const daySchedules = schedules?.filter((s) => dayKey(new Date(s.startAt)) === key) ?? []
          const dayTodos = todos?.filter((t) => t.dueDate === key) ?? []
          const isToday = isSameDay(day, now)
          return (
            <div
              key={key}
              className={cn(
                'flex min-h-40 flex-col gap-2 rounded-2xl border bg-card p-3 shadow-sm',
                isToday && 'border-primary ring-1 ring-primary',
              )}
            >
              <div className="flex items-baseline justify-between">
                <span className={cn('text-xs font-semibold', i >= 5 ? 'text-destructive' : 'text-muted-foreground')}>
                  {WEEKDAY_LABELS[i]}
                </span>
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                    isToday && 'bg-primary text-primary-foreground',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              {daySchedules.length === 0 && dayTodos.length === 0 && (
                <p className="text-xs text-muted-foreground/70">일정 없음</p>
              )}
              <ul className="flex flex-col gap-1.5">
                {daySchedules.map((s) => (
                  <li
                    key={s.id}
                    className={cn('flex flex-col gap-1 rounded-lg bg-secondary p-2 text-xs', s.done && 'opacity-50')}
                  >
                    <span className="font-semibold tabular-nums">{s.allDay ? '종일' : formatTime(new Date(s.startAt))}</span>
                    <span className={cn('text-pretty', s.done && 'line-through')}>
                      {s.customerName ? `${s.customerName} · ` : ''}
                      {s.title}
                    </span>
                    <CategoryBadges ids={s.categories} />
                  </li>
                ))}
              </ul>
              {dayTodos.length > 0 && (
                <ul className="mt-auto flex flex-col gap-1 border-t pt-2" aria-label="할 일">
                  {dayTodos.map((t) => (
                    <li key={t.id} className={cn('text-xs', t.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                      {t.done ? '✓' : '·'} {t.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">새 일정은 오늘 탭에서 입력할 수 있어요.</p>
    </section>
  )
}
