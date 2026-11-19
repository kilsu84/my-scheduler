'use client'

import { useMemo, useState } from 'react'
import { CalendarCheck2, CalendarClock, CornerDownLeft, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CategoryPicker } from './category-picker'
import { CategoryBadges } from './category-badges'
import { parseSchedules } from '@/lib/date-parser'
import { formatFullDate, formatTime, relativeDayLabel } from '@/lib/date-utils'
import { createSchedule } from '@/app/actions/schedules'
import { useRefreshPlanner } from '@/hooks/use-planner-data'

const EXAMPLES = [
  '내일 오후 3시 김민수 고객 배송 확인',
  '11/20, 11/22, 11/25 오후 7시 헬스장 운동',
  '11/27~11/29 제주도 가족 여행',
  '25일 결제 마감',
]

export function ScheduleComposer() {
  const [text, setText] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [customerName, setCustomerName] = useState('')
  const [saving, setSaving] = useState(false)
  const refresh = useRefreshPlanner()

  const parsedList = useMemo(() => (text.trim() ? parseSchedules(text) : []), [text])
  const isCustomer = categories.includes('customer')

  async function handleSubmit() {
    if (parsedList.length === 0 || saving) return
    setSaving(true)

    let okCount = 0
    let syncedCount = 0
    let failedCount = 0

    for (const item of parsedList) {
      const result = await createSchedule({
        rawText: text.trim(),
        title: item.title,
        customerName: isCustomer ? customerName : undefined,
        categories,
        startAt: item.start.toISOString(),
        endAt: item.end?.toISOString() ?? null,
        allDay: item.allDay,
      })

      if (result.ok) {
        okCount++
        if (result.google === 'synced') syncedCount++
      } else {
        failedCount++
      }
    }

    setSaving(false)

    if (okCount === 0) {
      toast.error('일정 등록에 실패했어요.')
      return
    }

    if (parsedList.length === 1) {
      const first = parsedList[0]
      const when = `${formatFullDate(first.start)}${first.allDay ? '' : ` ${formatTime(first.start)}`}`
      if (syncedCount === 1) toast.success('일정을 등록하고 구글 캘린더에 기록했어요.', { description: when })
      else toast.success('일정을 등록했어요.', { description: when })
    } else {
      const desc =
        syncedCount === okCount
          ? `구글 캘린더에도 ${syncedCount}건 모두 기록했어요.`
          : failedCount > 0
            ? `${failedCount}건은 등록에 실패했어요.`
            : '각 날짜에 나누어 저장했어요.'
      toast.success(`총 ${okCount}건의 일정을 등록했어요.`, { description: desc })
    }

    setText('')
    setCustomerName('')
    setCategories([])
    await refresh.schedules()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <section aria-labelledby="composer-title" className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="composer-title" className="font-serif text-lg font-bold">
            새 일정 받아적기
          </h2>
          <p className="text-sm text-muted-foreground">
            평소 말하듯 적으세요. 여러 날짜(예: 11/20, 11/22 또는 11/27~11/29)도 자동으로 나누어 등록합니다.
          </p>
        </div>
      </div>

      <CategoryPicker selected={categories} onChange={setCategories} />

      {isCustomer && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="customer-name" className="flex items-center gap-1.5">
            <UserRound className="size-3.5" aria-hidden="true" />
            고객명
          </Label>
          <Input
            id="customer-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="예: 김민수 (선택)"
            autoComplete="off"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="schedule-text" className="sr-only">
          일정 내용
        </Label>
        <Textarea
          id="schedule-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="예: 11/20, 11/22 오후 3시 운동 (줄바꿈은 Shift+Enter)"
          className="min-h-24 resize-none text-base"
        />
        {!text && (
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setText(ex)}
                className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {parsedList.length > 0 && (
        <div
          aria-live="polite"
          className="flex flex-col gap-3 rounded-xl border border-dashed border-gold/60 bg-accent/60 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold text-gold-foreground">
              {parsedList[0].recognized ? (
                <CalendarCheck2 className="size-4.5" aria-hidden="true" />
              ) : (
                <CalendarClock className="size-4.5" aria-hidden="true" />
              )}
            </span>

            {parsedList.length === 1 ? (
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {parsedList[0].recognized
                    ? `인식한 날짜 · "${parsedList[0].matches.join(' ')}"`
                    : '날짜를 찾지 못해 오늘로 등록합니다'}
                </p>
                <p className="font-medium">
                  {relativeDayLabel(parsedList[0].start) && (
                    <span className="mr-1.5 text-gold-foreground">{relativeDayLabel(parsedList[0].start)}</span>
                  )}
                  {formatFullDate(parsedList[0].start)}
                  <span className="ml-1.5 text-muted-foreground">
                    {parsedList[0].allDay
                      ? '종일'
                      : `${formatTime(parsedList[0].start)}${parsedList[0].end ? ` – ${formatTime(parsedList[0].end)}` : ''}`}
                  </span>
                </p>
                <p className="break-words text-sm text-muted-foreground">
                  {isCustomer && customerName ? `${customerName} · ` : ''}
                  {parsedList[0].title}
                </p>
                <CategoryBadges ids={categories} />
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-xs font-semibold text-gold-foreground">
                  총 {parsedList.length}건의 일정으로 나누어 등록합니다
                </p>
                <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs sm:text-sm">
                  {parsedList.map((item, idx) => (
                    <li key={idx} className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium tabular-nums">
                        {formatFullDate(item.start)}
                        {!item.allDay && ` ${formatTime(item.start)}`}
                      </span>
                      <span className="text-muted-foreground">
                        {isCustomer && customerName ? `${customerName} · ` : ''}
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ul>
                <CategoryBadges ids={categories} />
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={saving} size="lg" className="shrink-0">
            {saving ? '등록 중…' : parsedList.length > 1 ? `${parsedList.length}건 등록` : '등록'}
            {!saving && <CornerDownLeft className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      )}
    </section>
  )
}
