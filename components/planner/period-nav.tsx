'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  todayLabel: string
}

export function PeriodNav({ label, onPrev, onNext, onToday, todayLabel }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-serif text-xl font-bold tabular-nums" aria-live="polite">
        {label}
      </h2>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onToday}>
          {todayLabel}
        </Button>
        <Button variant="ghost" size="icon" onClick={onPrev} aria-label="이전">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNext} aria-label="다음">
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
