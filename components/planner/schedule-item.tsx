'use client'

import { useState } from 'react'
import { CalendarCheck, CalendarX2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatFullDate, formatShortDate, formatTime } from '@/lib/date-utils'
import { ALL_CATEGORIES } from '@/lib/categories'
import { CategoryBadges } from './category-badges'
import { deleteSchedule, setScheduleDone, updateSchedule, type ScheduleDTO } from '@/app/actions/schedules'
import { useRefreshPlanner } from '@/hooks/use-planner-data'

function toDateInput(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toTimeInput(d: Date) {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function ScheduleItem({ schedule, showDate = false }: { schedule: ScheduleDTO; showDate?: boolean }) {
  const refresh = useRefreshPlanner()
  const start = new Date(schedule.startAt)
  const end = schedule.endAt ? new Date(schedule.endAt) : null

  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [title, setTitle] = useState(schedule.title)
  const [customerName, setCustomerName] = useState(schedule.customerName ?? '')
  const [dateStr, setDateStr] = useState(() => toDateInput(start))
  const [startTime, setStartTime] = useState(() => toTimeInput(start))
  const [endTime, setEndTime] = useState(() => (end ? toTimeInput(end) : ''))
  const [allDay, setAllDay] = useState(schedule.allDay)
  const [categories, setCategories] = useState<string[]>(schedule.categories)
  const [saving, setSaving] = useState(false)

  function openEdit() {
    const s = new Date(schedule.startAt)
    const e = schedule.endAt ? new Date(schedule.endAt) : null
    setTitle(schedule.title)
    setCustomerName(schedule.customerName ?? '')
    setDateStr(toDateInput(s))
    setStartTime(toTimeInput(s))
    setEndTime(e ? toTimeInput(e) : '')
    setAllDay(schedule.allDay)
    setCategories(schedule.categories)
    setDetailOpen(false)
    setEditOpen(true)
  }

  function toggleCategory(id: string) {
    setCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('제목을 입력해 주세요.')
      return
    }

    const startISO = allDay
      ? new Date(`${dateStr}T00:00:00`).toISOString()
      : new Date(`${dateStr}T${startTime || '09:00'}:00`).toISOString()
    const endISO =
      !allDay && endTime ? new Date(`${dateStr}T${endTime}:00`).toISOString() : null

    setSaving(true)
    try {
      const res = await updateSchedule({
        id: schedule.id,
        rawText: schedule.rawText,
        title: title.trim(),
        customerName: customerName.trim() || undefined,
        categories,
        startAt: startISO,
        endAt: endISO,
        allDay,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('일정을 수정했어요.')
      setEditOpen(false)
      await refresh.schedules()
    } catch {
      toast.error('일정 수정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(checked: boolean) {
    await setScheduleDone(schedule.id, checked)
    await refresh.schedules()
  }

  async function remove() {
    await deleteSchedule(schedule.id)
    setDetailOpen(false)
    toast.success('일정을 삭제했어요.')
    await refresh.schedules()
  }

  return (
    <>
      <li className="group flex flex-col gap-2 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Checkbox
              checked={schedule.done}
              onCheckedChange={(checked) => toggle(Boolean(checked))}
              aria-label={`${schedule.title} 완료 표시`}
            />
            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
              {showDate && <span className="text-muted-foreground">{formatShortDate(start)}</span>}
              <span className="font-semibold tabular-nums">
                {schedule.allDay ? '종일' : formatTime(start)}
                {end ? ` ~ ${formatTime(end)}` : ''}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {schedule.syncStatus === 'synced' ? (
              <CalendarCheck className="size-4 text-cat-payment-foreground" aria-label="구글 캘린더에 기록됨" />
            ) : (
              <CalendarX2 className="size-4 text-muted-foreground/60" aria-label="구글 캘린더 미기록" />
            )}
            <button
              type="button"
              onClick={openEdit}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={`${schedule.title} 수정`}
            >
              <Pencil className="size-3" aria-hidden="true" />
              수정
            </button>
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              aria-label={`${schedule.title} 삭제`}
            >
              <Trash2 className="size-3" aria-hidden="true" />
              삭제
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className={cn(
            'flex w-full flex-col gap-1.5 rounded-lg pl-7 text-left transition-colors hover:bg-secondary/40',
            schedule.done && 'opacity-50',
          )}
        >
          <p className={cn('break-words text-sm leading-relaxed text-pretty', schedule.done && 'line-through')}>
            {schedule.customerName && <span className="mr-1.5 font-semibold">{schedule.customerName}</span>}
            {schedule.title}
          </p>
          <CategoryBadges ids={schedule.categories} />
        </button>
      </li>

      {/* 상세 보기 팝업 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="break-words pr-6 text-left leading-snug">
              {schedule.customerName ? `${schedule.customerName} · ` : ''}
              {schedule.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
              <p className="font-medium">{formatFullDate(start)}</p>
              <p className="text-muted-foreground tabular-nums">
                {schedule.allDay ? '종일 일정' : `${formatTime(start)}${end ? ` ~ ${formatTime(end)}` : ''}`}
              </p>
            </div>

            {schedule.categories.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">카테고리</p>
                <CategoryBadges ids={schedule.categories} />
              </div>
            )}

            {schedule.rawText && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">전체 내용 (원문)</p>
                <p className="whitespace-pre-wrap break-words rounded-lg border bg-background p-3 leading-relaxed">
                  {schedule.rawText}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="mr-1.5 size-3.5" aria-hidden="true" />
                수정
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={remove}>
                <Trash2 className="mr-1.5 size-3.5" aria-hidden="true" />
                삭제
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 수정 팝업 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>일정 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-title-${schedule.id}`}>제목</Label>
              <Input
                id={`edit-title-${schedule.id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-customer-${schedule.id}`}>고객명 (선택)</Label>
              <Input
                id={`edit-customer-${schedule.id}`}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="예: 홍길동"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`edit-date-${schedule.id}`}>날짜</Label>
                <Input
                  id={`edit-date-${schedule.id}`}
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={allDay} onCheckedChange={(c) => setAllDay(Boolean(c))} />
                  종일 일정
                </label>
              </div>
            </div>

            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`edit-start-${schedule.id}`}>시작 시간</Label>
                  <Input
                    id={`edit-start-${schedule.id}`}
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`edit-end-${schedule.id}`}>종료 시간 (선택)</Label>
                  <Input
                    id={`edit-end-${schedule.id}`}
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>카테고리</Label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CATEGORIES.map((cat) => {
                  const active = categories.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '저장 중…' : '저장하기'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
