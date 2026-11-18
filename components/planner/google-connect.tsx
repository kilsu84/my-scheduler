'use client'

import { useState } from 'react'
import { CalendarSync, CheckCircle2, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { connectGoogleCalendar } from '@/app/actions/google'
import { syncPendingSchedules } from '@/app/actions/schedules'
import { useGoogleStatus, useRefreshPlanner, useUnsyncedCount } from '@/hooks/use-planner-data'

export function GoogleConnect() {
  const { data: status, isLoading } = useGoogleStatus()
  const { data: unsynced = 0 } = useUnsyncedCount()
  const refresh = useRefreshPlanner()
  const [busy, setBusy] = useState(false)

  async function connect() {
    setBusy(true)
    const result = await connectGoogleCalendar()
    setBusy(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    if (window.self !== window.top) window.open(result.url, '_blank', 'noopener,noreferrer')
    else window.location.href = result.url
  }

  async function sync() {
    setBusy(true)
    const result = await syncPendingSchedules()
    setBusy(false)
    if (result.status !== 'connected') {
      toast.error('구글 캘린더 연결을 다시 확인해 주세요.')
    } else if (result.failed) {
      toast.warning(`${result.synced}건 기록, ${result.failed}건 실패했어요.`)
    } else {
      toast.success(`${result.synced}건을 구글 캘린더에 기록했어요.`)
    }
    await Promise.all([refresh.schedules(), refresh.google()])
  }

  if (isLoading) {
    return <div className="h-[88px] animate-pulse rounded-2xl border bg-card" aria-hidden="true" />
  }

  if (status === 'connected') {
    return (
      <section aria-label="구글 캘린더 연동" className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <CheckCircle2 className="size-5 shrink-0 text-cat-payment-foreground" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-sm font-medium">구글 캘린더 자동 기록 중</p>
          <p className="text-xs text-muted-foreground">
            {unsynced > 0 ? `아직 기록되지 않은 일정 ${unsynced}건` : '모든 일정이 기록되어 있어요'}
          </p>
        </div>
        {unsynced > 0 && (
          <Button size="sm" variant="outline" onClick={sync} disabled={busy}>
            <CalendarSync className="size-4" aria-hidden="true" />
            동기화
          </Button>
        )}
      </section>
    )
  }

  if (status === 'unavailable') {
    return (
      <section aria-label="구글 캘린더 연동" className="flex flex-col gap-1 rounded-2xl border border-dashed bg-card p-4">
        <p className="text-sm font-medium">구글 캘린더 연동 준비 중</p>
        <p className="text-xs text-pretty text-muted-foreground">
          연동 설정이 완료되면 이곳에서 연결할 수 있어요. 일정은 그동안에도 안전하게 저장됩니다.
        </p>
      </section>
    )
  }

  return (
    <section
      aria-label="구글 캘린더 연동"
      className="flex flex-col gap-3 rounded-2xl border border-gold/50 bg-accent p-4 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">구글 캘린더를 연결해 주세요</p>
        <p className="text-xs text-pretty text-muted-foreground">
          연결하면 등록하는 모든 일정이 해당 날짜에 자동 기록되고, 30분·10분 전에 알림이 울립니다.
          {unsynced > 0 && ` 대기 중인 ${unsynced}건도 함께 기록됩니다.`}
        </p>
      </div>
      <Button onClick={connect} disabled={busy} className="w-full">
        <Link2 className="size-4" aria-hidden="true" />
        {busy ? '연결 준비 중…' : '구글 캘린더 연결'}
      </Button>
    </section>
  )
}
