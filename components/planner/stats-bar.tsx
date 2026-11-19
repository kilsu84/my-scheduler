'use client'

import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getCategory } from '@/lib/categories'
import { downloadSchedulesCsv } from '@/lib/export-csv'
import type { ScheduleDTO } from '@/app/actions/schedules'

export function StatsBar({
  schedules,
  periodLabel,
}: {
  schedules: ScheduleDTO[]
  periodLabel: string
}) {
  const total = schedules.length
  const done = schedules.filter((s) => s.done).length
  const rate = total > 0 ? Math.round((done / total) * 100) : 0

  const categoryCounts = new Map<string, number>()
  for (const s of schedules) {
    for (const catId of s.categories) {
      categoryCounts.set(catId, (categoryCounts.get(catId) ?? 0) + 1)
    }
  }
  const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])

  function handleExport() {
    if (schedules.length === 0) {
      toast.error('다운로드할 일정이 없습니다.')
      return
    }
    downloadSchedulesCsv(schedules, `일정_${periodLabel}`)
    toast.success(`${periodLabel} 일정 ${schedules.length}건을 엑셀(CSV)로 저장했어요.`)
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">총 일정 </span>
            <span className="font-bold tabular-nums">{total}건</span>
          </div>
          <div>
            <span className="text-muted-foreground">완료 </span>
            <span className="font-bold tabular-nums text-primary">{done}건</span>
          </div>
          <div>
            <span className="text-muted-foreground">달성률 </span>
            <span className="font-bold tabular-nums">{rate}%</span>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleExport} className="h-8 gap-1.5 text-xs">
          <Download className="size-3.5" aria-hidden="true" />
          이 기간 엑셀 저장
        </Button>
      </div>

      {topCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t pt-2.5">
          {topCategories.map(([id, count]) => {
            const cat = getCategory(id)
            if (!cat) return null
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                <span>{cat.label}</span>
                <span className="font-bold tabular-nums">{count}</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
