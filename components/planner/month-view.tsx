'use client'

import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { addDays, dayKey, formatFullDate, isSameDay, startOfMonth, startOfWeek } from '@/lib/date-utils'
import { useSchedules, useTodosInRange } from '@/hooks/use-planner-data'
import { getCategory } from '@/lib/categories'
import { PeriodNav } from './period-nav'
import { ScheduleItem } from './schedule-item'

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export function MonthView({
  anchor,
  onAnchorChange,
  now,
  onSelectDate,
}: {
  anchor: Date
  onAnchorChange: (d: Date) => void
  now: Date
  onSelectDate: (d: Date) => void
}) {
  const monthStart = useMemo(() => startOfMonth(anchor), [anchor])
  const gridStart = useMemo(() => startOfWeek(monthStart), [monthStart])
  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart])
  const gridEnd = useMemo(() => addDays(gridStart, 42), [gridStart])
  const [selected, setSelected] = useState<Date>(now)

  const { data: schedules } = useSchedules(gridStart, gridEnd)
  const { data: todos } = useTodosInRange(dayKey(gridStart), dayKey(addDays(gridStart, 41)))

  const byDay = useMemo(() => {
    const map = new Map<string, NonNullable<typeof schedules>>()
    for (const s of schedules ?? []) {
      const key = dayKey(new Date(s.startAt))
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return map
  }, [schedules])

  const selectedKey = dayKey(selected)
  const selectedSchedules = byDay.get(selectedKey) ?? []
  const selectedTodos = todos?.filter((t) => t.dueDate === selectedKey) ?? []

  function shiftMonth(delta: number) {
    onAnchorChange(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="월간 달력" className="flex flex-col gap-4">
        <PeriodNav
          label={`${monthStart.getFullYear()}년 ${monthStart.getMonth() + 1}월`}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
          onToday={() => {
            onAnchorChange(new Date())
            setSelected(new Date())
          }}
          todayLabel="이번 달"
        />
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="grid grid-cols-7 border-b bg-secondary/60">
            {WEEKDAY_LABELS.map((w, i) => (
              <div
                key={w}
                className={cn('py-2 text-center text-xs font-semibold', i >= 5 ? 'text-destructive' : 'text-muted-foreground')}
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const key = dayKey(day)
              const items = byDay.get(key) ?? []
              const inMonth = day.getMonth() === monthStart.getMonth()
              const isToday = isSameDay(day, now)
              const isSelected = key === selectedKey
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelected(day)
                    }
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${formatFullDate(day)}, 일정 ${items.length}건`}
                  className={cn(
                    'flex min-h-20 cursor-pointer flex-col gap-1 border-r border-b p-1.5 text-left transition-colors outline-none hover:bg-secondary/60 focus-visible:bg-accent md:min-h-24',
                    (i + 1) % 7 === 0 && 'border-r-0',
                    i >= 35 && 'border-b-0',
                    !inMonth && 'bg-muted/40 text-muted-foreground/60',
                    isSelected && 'bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                      isToday && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    {items.slice(0, 2).map((s) => {
                      const sub = s.categories.map(getCategory).find((c) => c && c.id !== 'customer')
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectDate(day)
                          }}
                          className={cn(
                            'w-full truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight hover:opacity-80 md:text-[11px]',
                            sub ? sub.className : 'bg-secondary text-secondary-foreground',
                            s.done && 'line-through opacity-60',
                          )}
                        >
                          {s.customerName ?? s.title}
                        </button>
                      )
                    })}
                    {items.length > 2 && (
                      <span className="px-1 text-[10px] font-medium text-muted-foreground">+{items.length - 2}건</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <aside aria-label="선택한 날짜" className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm lg:self-start">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-lg font-bold">{formatFullDate(selected)}</h2>
          <Button variant="ghost" size="sm" onClick={() => onSelectDate(selected)} className="h-8 gap-1 px-2 text-xs">
            일간 보기
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
        {selectedSchedules.length ? (
          <ul className="flex flex-col divide-y">
            {selectedSchedules.map((s) => (
              <ScheduleItem key={s.id} schedule={s} />
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">이 날은 일정이 없습니다.</p>
        )}
        {selectedTodos.length > 0 && (
          <div className="flex flex-col gap-1 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground">할 일</p>
            <ul className="flex flex-col gap-1">
              {selectedTodos.map((t) => (
                <li key={t.id} className={cn('text-sm', t.done && 'text-muted-foreground line-through')}>
                  {t.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  )
}
