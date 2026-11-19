import { categoryLabels } from '@/lib/categories'
import type { ScheduleDTO } from '@/app/actions/schedules'

function escapeCsv(value: string | null | undefined) {
  const str = String(value ?? '').replace(/"/g, '""')
  return `"${str}"`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function downloadSchedulesCsv(schedules: ScheduleDTO[], filePrefix: string) {
  const headers = ['날짜', '시작시간', '종료시간', '종일여부', '완료여부', '카테고리', '고객명', '제목', '원문', '구글연동']

  const rows = schedules.map((s) => [
    formatDate(s.startAt),
    s.allDay ? '종일' : formatTime(s.startAt),
    s.endAt ? formatTime(s.endAt) : '',
    s.allDay ? 'Y' : 'N',
    s.done ? '완료' : '미완료',
    categoryLabels(s.categories).join(', '),
    s.customerName ?? '',
    s.title,
    s.rawText,
    s.syncStatus === 'synced' ? '연동됨' : '미연동',
  ])

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
      .join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const today = formatDate(new Date().toISOString())
  a.href = url
  a.download = `${filePrefix}_${today}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
