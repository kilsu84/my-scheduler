'use client'

import { CalendarCheck, CalendarX2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { formatShortDate, formatTime } from '@/lib/date-utils'
import { CategoryBadges } from './category-badges'
import { deleteSchedule, setScheduleDone, type ScheduleDTO } from '@/app/actions/schedules'
import { useRefreshPlanner } from '@/hooks/use-planner-data'

export function ScheduleItem({ schedule, showDate = false }: { schedule: ScheduleDTO; showDate?: boolean }) {
  const refresh = useRefreshPlanner()
  const start = new Date(schedule.startAt)
  const end = schedule.endAt ? new Date(schedule.endAt) : null

  async function toggle(checked: boolean) {
    await setScheduleDone(schedule.id, checked)
    await refresh.schedules()
  }

  async function remove() {
    await deleteSchedule(schedule.id)
    toast.success('일정을 삭제했어요.')
    await refresh.schedules()
  }

  return (
    <li className="group flex items-start gap-3 py-3">
      <Checkbox
        checked={schedule.done}
        onCheckedChange={(checked) => toggle(Boolean(checked))}
        aria-label={`${schedule.title} 완료 표시`}
        className="mt-1"
      />
      <div className="flex w-20 shrink-0 flex-col text-sm">
        {showDate && <span className="text-xs text-muted-foreground">{formatShortDate(start)}</span>}
        <span className="font-medium tabular-nums">{schedule.allDay ? '종일' : formatTime(start)}</span>
        {end && <span className="text-xs text-muted-foreground tabular-nums">~ {formatTime(end)}</span>}
      </div>
      <div className={cn('flex min-w-0 flex-1 flex-col gap-1', schedule.done && 'opacity-50')}>
        <p className={cn('text-sm leading-relaxed text-pretty', schedule.done && 'line-through')}>
          {schedule.customerName && <span className="mr-1 font-semibold">{schedule.customerName}</span>}
          {schedule.title}
        </p>
        <CategoryBadges ids={schedule.categories} />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {schedule.syncStatus === 'synced' ? (
          <CalendarCheck className="size-4 text-cat-payment-foreground" aria-label="구글 캘린더에 기록됨" />
        ) : (
          <CalendarX2 className="size-4 text-muted-foreground/60" aria-label="구글 캘린더 미기록" />
        )}
        <button
          type="button"
          onClick={remove}
          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
          aria-label={`${schedule.title} 삭제`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}
