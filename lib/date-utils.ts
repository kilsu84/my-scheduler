export function startOfDay(d: Date) {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

export function addDays(d: Date, days: number) {
  const n = new Date(d)
  n.setDate(n.getDate() + days)
  return n
}

export function startOfWeek(d: Date) {
  const n = startOfDay(d)
  const day = n.getDay()
  return addDays(n, day === 0 ? -6 : 1 - day)
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function dayKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isSameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b)
}

const timeFmt = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' })
const fullDateFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
const shortDateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

export const formatTime = (d: Date) => timeFmt.format(d)
export const formatFullDate = (d: Date) => fullDateFmt.format(d)
export const formatShortDate = (d: Date) => shortDateFmt.format(d)

export function relativeDayLabel(d: Date, ref = new Date()) {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(ref).getTime()) / 86_400_000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '내일'
  if (diff === 2) return '모레'
  if (diff === -1) return '어제'
  if (diff > 0 && diff < 7) return `${diff}일 후`
  if (diff < 0) return `${-diff}일 전`
  return null
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 5) return '늦은 밤입니다'
  if (h < 11) return '좋은 아침입니다'
  if (h < 14) return '점심 시간입니다'
  if (h < 18) return '오후도 힘내세요'
  return '오늘 하루 수고 많으셨습니다'
}
