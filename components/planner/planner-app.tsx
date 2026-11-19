'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellOff, KeyRound, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import { formatFullDate, greeting } from '@/lib/date-utils'
import { TodayView } from './today-view'
import { WeekView } from './week-view'
import { MonthView } from './month-view'

type View = 'today' | 'week' | 'month'
const VIEWS: { id: View; label: string }[] = [
  { id: 'today', label: '오늘' },
  { id: 'week', label: '주간' },
  { id: 'month', label: '월간' },
]

function subscribeMinute(callback: () => void) {
  const id = window.setInterval(callback, 60_000)
  return () => window.clearInterval(id)
}
let cachedMinute = 0
let cachedNow = new Date()
function getNowSnapshot() {
  const minute = Math.floor(Date.now() / 60_000)
  if (minute !== cachedMinute) {
    cachedMinute = minute
    cachedNow = new Date()
  }
  return cachedNow
}

const getServerNow = () => null
const subscribeNoop = () => () => {}
const getPermission = (): NotificationPermission | 'unsupported' =>
  'Notification' in window ? Notification.permission : 'unsupported'
const getServerPermission = () => 'unsupported' as const

function useNotificationPermission() {
  const live = useSyncExternalStore(subscribeNoop, getPermission, getServerPermission)
  const [override, setOverride] = useState<NotificationPermission | null>(null)
  const permission = override ?? live
  async function request() {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setOverride(result)
    if (result === 'granted') toast.success('일정 알림을 켰어요. 시작 30분·10분 전에 알려드릴게요.')
  }
  return { permission, request }
}

export function PlannerApp({ userName }: { userName: string }) {
  const router = useRouter()
  const now = useSyncExternalStore<Date | null>(subscribeMinute, getNowSnapshot, getServerNow)
  const [view, setView] = useState<View>('today')
  const [anchor, setAnchor] = useState(() => new Date())
  const { permission, request } = useNotificationPermission()

  const [pwOpen, setPwOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.error('새 비밀번호는 8자 이상 입력해 주세요.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 서로 일치하지 않습니다.')
      return
    }

    setPwLoading(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      })

      if (error) {
        toast.error(error.message || '현재 비밀번호가 올바르지 않습니다.')
        return
      }

      toast.success('비밀번호가 변경되었습니다.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwOpen(false)
    } catch {
      toast.error('비밀번호 변경 중 오류가 발생했습니다.')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-serif text-sm font-bold text-gold">
              秘
            </span>
            <span className="font-serif text-base font-bold">나의 비서</span>
          </div>
          <nav aria-label="보기 전환" className="flex rounded-full bg-secondary p-1">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? 'page' : undefined}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                  view === v.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            {permission !== 'unsupported' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={request}
                disabled={permission === 'granted'}
                aria-label={permission === 'granted' ? '알림 켜짐' : '알림 켜기'}
                title={permission === 'granted' ? '알림 켜짐' : '알림 켜기'}
              >
                {permission === 'granted' ? (
                  <Bell className="size-4 text-gold-foreground" aria-hidden="true" />
                ) : (
                  <BellOff className="size-4" aria-hidden="true" />
                )}
              </Button>
            )}

            <Dialog open={pwOpen} onOpenChange={setPwOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="비밀번호 변경" title="비밀번호 변경">
                  <KeyRound className="size-4" aria-hidden="true" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>비밀번호 변경</DialogTitle>
                  <DialogDescription>
                    현재 비밀번호를 확인한 뒤 새 비밀번호(8자 이상)로 변경합니다.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">현재 비밀번호</Label>
                    <Input
                      id="current-password"
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="현재 비밀번호 입력"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">새 비밀번호</Label>
                    <Input
                      id="new-password"
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8자 이상 입력"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="새 비밀번호 다시 입력"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setPwOpen(false)}>
                      취소
                    </Button>
                    <Button type="submit" disabled={pwLoading}>
                      {pwLoading ? '변경 중...' : '변경하기'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="로그아웃" title="로그아웃">
              <LogOut className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
        {!now && <div className="h-96 animate-pulse rounded-2xl border bg-card" aria-hidden="true" />}
        {now && view === 'today' && (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gold-foreground">{formatFullDate(now)}</p>
            <h1 className="font-serif text-2xl font-bold text-balance md:text-3xl">
              {userName}님, {greeting(now)}.
            </h1>
          </div>
        )}
        {now && view === 'today' && <TodayView now={now} />}
        {now && view === 'week' && <WeekView anchor={anchor} onAnchorChange={setAnchor} now={now} />}
        {now && view === 'month' && <MonthView anchor={anchor} onAnchorChange={setAnchor} now={now} />}
      </main>
    </div>
  )
}
