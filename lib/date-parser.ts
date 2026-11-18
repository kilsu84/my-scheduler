import * as chrono from 'chrono-node'

export type ParsedSchedule = {
  start: Date
  end?: Date
  allDay: boolean
  matches: string[]
  title: string
  recognized: boolean
}

const WEEKDAYS: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 }
const NATIVE_COUNTS: Record<string, number> = {
  하루: 1,
  이틀: 2,
  사흘: 3,
  나흘: 4,
  닷새: 5,
  엿새: 6,
  이레: 7,
  열흘: 10,
}
const PARTICLE = '(?:에는|에도|에|까지|부터|엔|쯤|경|중으로|중|전까지)?'

function startOfDay(d: Date) {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

function addDays(d: Date, days: number) {
  const n = new Date(d)
  n.setDate(n.getDate() + days)
  return n
}

function mondayOf(d: Date) {
  const n = startOfDay(d)
  const day = n.getDay()
  return addDays(n, day === 0 ? -6 : 1 - day)
}

function isValidDate(y: number, m: number, d: number) {
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

function lastDayOfMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate()
}

/** A month/day without a year that is clearly in the past most likely means next year. */
function resolveYearless(ref: Date, month: number, day: number) {
  const today = startOfDay(ref)
  const candidate = new Date(today.getFullYear(), month - 1, day)
  if (candidate.getTime() < addDays(today, -30).getTime()) {
    return new Date(today.getFullYear() + 1, month - 1, day)
  }
  return candidate
}

type DateRule = {
  pattern: RegExp
  resolve: (m: RegExpMatchArray, ref: Date) => Date | null
}

const DATE_RULES: DateRule[] = [
  {
    pattern: /(\d{4})\s*(?:년|[-./])\s*(\d{1,2})\s*(?:월|[-./])\s*(\d{1,2})\s*일?/,
    resolve: (m) => {
      const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
      return isValidDate(y, mo, d) ? new Date(y, mo - 1, d) : null
    },
  },
  {
    pattern: /(?<![\d:])(\d{2})[./-](\d{1,2})[./-](\d{1,2})(?![\d:])/,
    resolve: (m) => {
      const [y, mo, d] = [2000 + Number(m[1]), Number(m[2]), Number(m[3])]
      return isValidDate(y, mo, d) ? new Date(y, mo - 1, d) : null
    },
  },
  {
    pattern: /(이번\s*달|이달|금월|다음\s*달|담달|익월|다다음\s*달)\s*(\d{1,2}\s*일|말|초|중순)/,
    resolve: (m, ref) => {
      const offset = /다다음/.test(m[1]) ? 2 : /다음|담|익/.test(m[1]) ? 1 : 0
      const base = new Date(ref.getFullYear(), ref.getMonth() + offset, 1)
      const y = base.getFullYear()
      const mo = base.getMonth() + 1
      const token = m[2].replace(/\s/g, '')
      if (token === '말') return new Date(y, mo - 1, lastDayOfMonth(y, mo))
      if (token === '초') return new Date(y, mo - 1, 1)
      if (token === '중순') return new Date(y, mo - 1, 15)
      const d = Number(token.replace('일', ''))
      return isValidDate(y, mo, d) ? new Date(y, mo - 1, d) : null
    },
  },
  {
    pattern: /(\d{1,2})\s*월\s*(\d{1,2})\s*일/,
    resolve: (m, ref) => {
      const [mo, d] = [Number(m[1]), Number(m[2])]
      if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
      return resolveYearless(ref, mo, d)
    },
  },
  {
    pattern: /(\d{1,2})\s*월\s*(말|초|중순)/,
    resolve: (m, ref) => {
      const mo = Number(m[1])
      if (mo < 1 || mo > 12) return null
      const day = m[2] === '초' ? 1 : m[2] === '중순' ? 15 : 28
      const date = resolveYearless(ref, mo, day)
      if (m[2] === '말') date.setDate(lastDayOfMonth(date.getFullYear(), mo))
      return date
    },
  },
  {
    pattern: /(?<![\d:.])(\d{1,2})[./-](\d{1,2})(?![\d:]|\s*(?:만|원|%|배|kg|g))/,
    resolve: (m, ref) => {
      const [mo, d] = [Number(m[1]), Number(m[2])]
      if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
      return resolveYearless(ref, mo, d)
    },
  },
  {
    pattern: /(\d+|하루|이틀|사흘|나흘|닷새|엿새|이레|열흘)\s*(일|주|주일|개월|달)?\s*(후|뒤|이후)/,
    resolve: (m, ref) => {
      const amount = NATIVE_COUNTS[m[1]] ?? Number(m[1])
      const unit = NATIVE_COUNTS[m[1]] ? '일' : (m[2] ?? '일')
      const today = startOfDay(ref)
      if (unit === '주' || unit === '주일') return addDays(today, amount * 7)
      if (unit === '개월' || unit === '달') {
        return new Date(today.getFullYear(), today.getMonth() + amount, today.getDate())
      }
      return addDays(today, amount)
    },
  },
  {
    pattern:
      /(이번\s*주|금주|다음\s*주|차주|담주|다다음\s*주|지난\s*주|저번\s*주)\s*(월|화|수|목|금|토|일)(?:요일)?/,
    resolve: (m, ref) => {
      const week = m[1].replace(/\s/g, '')
      const offset = /다다음/.test(week) ? 14 : /다음|차주|담주/.test(week) ? 7 : /지난|저번/.test(week) ? -7 : 0
      const target = WEEKDAYS[m[2]]
      const index = target === 0 ? 6 : target - 1
      return addDays(mondayOf(ref), offset + index)
    },
  },
  {
    pattern: /(다음\s*주|차주|담주|다다음\s*주)(?!\s*(?:월|화|수|목|금|토|일))/,
    resolve: (m, ref) => addDays(mondayOf(ref), /다다음/.test(m[1]) ? 14 : 7),
  },
  {
    pattern: /(월|화|수|목|금|토|일)요일/,
    resolve: (m, ref) => {
      const today = startOfDay(ref)
      const diff = (WEEKDAYS[m[1]] - today.getDay() + 7) % 7
      return addDays(today, diff)
    },
  },
  {
    pattern: /(이번\s*)?주말/,
    resolve: (_m, ref) => addDays(mondayOf(ref), 5),
  },
  {
    pattern: /월말/,
    resolve: (_m, ref) => new Date(ref.getFullYear(), ref.getMonth(), lastDayOfMonth(ref.getFullYear(), ref.getMonth() + 1)),
  },
  {
    pattern: /(내일\s*모레|모레|낼\s*모레)/,
    resolve: (_m, ref) => addDays(startOfDay(ref), 2),
  },
  { pattern: /글피/, resolve: (_m, ref) => addDays(startOfDay(ref), 3) },
  { pattern: /(내일|명일|낼)/, resolve: (_m, ref) => addDays(startOfDay(ref), 1) },
  { pattern: /(어제|어저께|전일)/, resolve: (_m, ref) => addDays(startOfDay(ref), -1) },
  { pattern: /(오늘|금일|당일)/, resolve: (_m, ref) => startOfDay(ref) },
  {
    pattern: /(?<![\d월./-])(\d{1,2})\s*일(?!\s*(?:후|뒤|이후|전|간|동안|치|분))/,
    resolve: (m, ref) => {
      const d = Number(m[1])
      if (d < 1 || d > 31) return null
      const today = startOfDay(ref)
      let candidate = new Date(today.getFullYear(), today.getMonth(), d)
      if (candidate.getTime() < today.getTime()) {
        candidate = new Date(today.getFullYear(), today.getMonth() + 1, d)
      }
      return candidate
    },
  },
]

type TimeMatch = { hour: number; minute: number; text: string; index: number }

const TIME_PATTERN =
  /(오전|오후|아침|점심|낮|저녁|밤|새벽|am|pm)?\s*(\d{1,2})\s*(?:시\s*(?:(\d{1,2})\s*분|(반))?|:(\d{2}))\s*(am|pm)?/gi

function normalizeHour(hour: number, period?: string) {
  const p = period?.toLowerCase()
  if (p === '오후' || p === '저녁' || p === 'pm') return hour < 12 ? hour + 12 : hour
  if (p === '밤') return hour === 12 ? 0 : hour < 12 && hour >= 6 ? hour + 12 : hour
  if (p === '점심' || p === '낮') return hour < 6 ? hour + 12 : hour
  if (p === '오전' || p === '아침' || p === '새벽' || p === 'am') return hour === 12 ? 0 : hour
  // Without a period, 1-6 o'clock almost always means the afternoon in a business context.
  if (hour >= 1 && hour <= 6) return hour + 12
  return hour
}

function findTimes(text: string): TimeMatch[] {
  const results: TimeMatch[] = []
  for (const m of text.matchAll(TIME_PATTERN)) {
    const isColon = m[5] !== undefined
    const hasSi = /시/.test(m[0])
    if (!isColon && !hasSi) continue
    const raw = Number(m[2])
    if (raw > 24) continue
    const minute = m[4] ? 30 : Number(m[3] ?? m[5] ?? 0)
    if (minute > 59) continue
    const period = m[1] ?? m[6]
    const hour = isColon && !period ? raw : normalizeHour(raw, period)
    results.push({ hour: hour % 24, minute, text: m[0].trim(), index: m.index ?? 0 })
  }
  const special: Array<[RegExp, number]> = [
    [/정오/, 12],
    [/자정/, 0],
  ]
  for (const [pattern, hour] of special) {
    const m = text.match(pattern)
    if (m) results.push({ hour, minute: 0, text: m[0], index: m.index ?? 0 })
  }
  return results.sort((a, b) => a.index - b.index)
}

function cleanTitle(text: string, removed: string[]) {
  let title = text
  for (const piece of removed) {
    const escaped = piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    title = title.replace(new RegExp(`${escaped}\\s*${PARTICLE}`), ' ')
  }
  return title
    .replace(/\s*(~|부터|까지)\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.\-:]+|[\s,.\-:]+$/g, '')
    .trim()
}

export function parseSchedule(text: string, ref: Date = new Date()): ParsedSchedule {
  const matches: string[] = []
  let date: Date | null = null
  let working = text

  for (const rule of DATE_RULES) {
    const m = working.match(rule.pattern)
    if (!m) continue
    const resolved = rule.resolve(m, ref)
    if (!resolved) continue
    date = resolved
    matches.push(m[0].trim())
    working = working.replace(m[0], ' ')
    break
  }

  const times = findTimes(working)
  for (const t of times.slice(0, 2)) matches.push(t.text)

  if (!date && times.length === 0) {
    const chronoResult = chrono.parse(text, ref, { forwardDate: true })[0]
    if (chronoResult) {
      const start = chronoResult.start.date()
      const allDay = !chronoResult.start.isCertain('hour')
      return {
        start: allDay ? startOfDay(start) : start,
        end: chronoResult.end?.date(),
        allDay,
        matches: [chronoResult.text],
        title: cleanTitle(text, [chronoResult.text]) || text.trim(),
        recognized: true,
      }
    }
    return {
      start: startOfDay(ref),
      allDay: true,
      matches: [],
      title: text.trim(),
      recognized: false,
    }
  }

  const base = date ?? startOfDay(ref)
  if (times.length === 0) {
    return { start: base, allDay: true, matches, title: cleanTitle(text, matches) || text.trim(), recognized: true }
  }

  const start = new Date(base)
  start.setHours(times[0].hour, times[0].minute, 0, 0)
  let end: Date | undefined
  if (times[1]) {
    end = new Date(base)
    let endHour = times[1].hour
    if (endHour < times[0].hour && endHour + 12 < 24 && !/(오전|아침|새벽|am)/i.test(times[1].text)) {
      endHour += 12
    }
    end.setHours(endHour, times[1].minute, 0, 0)
    if (end <= start) end = undefined
  }

  return {
    start,
    end,
    allDay: false,
    matches,
    title: cleanTitle(text, matches) || text.trim(),
    recognized: true,
  }
}
