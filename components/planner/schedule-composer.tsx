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
import { parseSchedule } from '@/lib/date-parser'
import { formatFullDate, formatTime, relativeDayLabel } from '@/lib/date-utils'
import { createSchedule } from '@/app/actions/schedules'
import { useRefreshPlanner } from '@/hooks/use-planner-data'

const EXAMPLES = ['내일 오후 3시 김민수 고객 배송 확인', '다음주 화요일 10시 반 임원 회의', '12/5 사은품 발송', '25일 결제 마감']

export function ScheduleComposer() {
  const [text, setText] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [customerName, setCustomerName] = useState('')
  const [saving, setSaving] = useState(false)
  const refresh = useRefreshPlanner()

  const parsed = useMemo(() => (text.trim() ? parseSchedule(text) : null), [text])
  const isCustomer = categories.includes('customer')

  async function handleSubmit() {
    if (!parsed || saving) return
    setSaving(true)
    const result = await createSchedule({
      rawText: text.trim(),
      title: parsed.title,
      customerName: isCustomer ? customerName : undefined,
      categories,
      startAt: parsed.start.toISOString(),
      endAt: parsed.end?.toISOString() ?? null,
      allDay: parsed.allDay,
    })
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    const when = `${formatFullDate(parsed.start)}${parsed.allDay ? '' : ` ${formatTime(parsed.start)}`}`
    if (result.google === 'synced') toast.success('일정을 등록하고 구글 캘린더에 기록했어요.', { description: when })
    else if (result.google === 'authorization_required' || result.google === 'unavailable')
      toast.success('일정을 등록했어요.', { description: '구글 캘린더를 연결하면 자동으로 기록됩니다.' })
    else toast.warning('일정은 저장했지만 구글 캘린더 기록에 실패했어요.', { description: '나중에 다시 동기화할 수 있어요.' })

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

  const relative = parsed ? relativeDayLabel(parsed.start) : null

  return (
    <section aria-labelledby="composer-title" className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="composer-title" className="font-serif text-lg font-bold">
            새 일정 받아적기
          </h2>
          <p className="text-sm text-muted-foreground">평소 말하듯 적으세요. 날짜와 시간은 제가 알아듣겠습니다.</p>
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
          placeholder="예: 내일 오후 3시 김민수 고객 배송 확인"
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

      {parsed && (
        <div
          aria-live="polite"
          className="flex flex-col gap-3 rounded-xl border border-dashed border-gold/60 bg-accent/60 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold text-gold-foreground">
              {parsed.recognized ? (
                <CalendarCheck2 className="size-4.5" aria-hidden="true" />
              ) : (
                <CalendarClock className="size-4.5" aria-hidden="true" />
              )}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                {parsed.recognized ? `인식한 날짜 · "${parsed.matches.join(' ')}"` : '날짜를 찾지 못해 오늘로 등록합니다'}
              </p>
              <p className="font-medium">
                {relative && <span className="mr-1.5 text-gold-foreground">{relative}</span>}
                {formatFullDate(parsed.start)}
                <span className="ml-1.5 text-muted-foreground">
                  {parsed.allDay
                    ? '종일'
                    : `${formatTime(parsed.start)}${parsed.end ? ` – ${formatTime(parsed.end)}` : ''}`}
                </span>
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {isCustomer && customerName ? `${customerName} · ` : ''}
                {parsed.title}
              </p>
              <CategoryBadges ids={categories} />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={saving} size="lg" className="shrink-0">
            {saving ? '등록 중…' : '등록'}
            {!saving && <CornerDownLeft className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      )}
    </section>
  )
}
