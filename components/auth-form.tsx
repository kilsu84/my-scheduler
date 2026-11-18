'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })
    setLoading(false)
    if (error) {
      setError(isSignUp ? '가입하지 못했어요. 입력 내용을 확인해 주세요.' : '이메일 또는 비밀번호가 올바르지 않아요.')
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-xs font-medium tracking-[0.3em] text-gold-foreground uppercase">My Secretary</p>
          <h1 className="font-serif text-3xl font-bold text-balance text-foreground">나의 비서</h1>
          <p className="text-sm text-pretty text-muted-foreground">
            {isSignUp ? '오늘부터 일정과 고객 관리를 맡겨 주세요.' : '다시 오신 것을 환영합니다.'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm"
        >
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">호칭</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 김대표"
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            {isSignUp && <p className="text-xs text-muted-foreground">8자 이상 입력해 주세요.</p>}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} size="lg" className="mt-2 w-full">
            {loading ? '잠시만 기다려 주세요…' : isSignUp ? '시작하기' : '로그인'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? '이미 계정이 있으신가요? ' : '처음이신가요? '}
          <Link
            href={isSignUp ? '/sign-in' : '/sign-up'}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {isSignUp ? '로그인' : '계정 만들기'}
          </Link>
        </p>
      </div>
    </main>
  )
}
