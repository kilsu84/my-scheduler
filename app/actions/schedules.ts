'use server'

import { and, asc, eq, gte, lt, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { schedules, type Schedule } from '@/lib/db/schema'
import { getUserId } from '@/lib/session'
import { VALID_CATEGORY_IDS } from '@/lib/categories'
import {
  deleteCalendarEvent,
  getCalendarToken,
  insertCalendarEvent,
  updateCalendarEvent,
} from '@/lib/google-calendar'

export type ScheduleDTO = Omit<Schedule, 'startAt' | 'endAt' | 'createdAt' | 'userId'> & {
  startAt: string
  endAt: string | null
  createdAt: string
}

function toDTO(s: Schedule): ScheduleDTO {
  return {
    id: s.id,
    rawText: s.rawText,
    title: s.title,
    customerName: s.customerName,
    categories: s.categories,
    startAt: s.startAt.toISOString(),
    endAt: s.endAt ? s.endAt.toISOString() : null,
    allDay: s.allDay,
    done: s.done,
    googleEventId: s.googleEventId,
    syncStatus: s.syncStatus,
    createdAt: s.createdAt.toISOString(),
  }
}

function parseDate(value: unknown) {
  if (typeof value !== 'string') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function listSchedules(fromISO: string, toISO: string): Promise<ScheduleDTO[]> {
  const userId = await getUserId()
  const from = parseDate(fromISO)
  const to = parseDate(toISO)
  if (!from || !to) throw new Error('Invalid range')
  const rows = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.userId, userId), gte(schedules.startAt, from), lt(schedules.startAt, to)))
    .orderBy(asc(schedules.startAt))
  return rows.map(toDTO)
}

export type CreateScheduleInput = {
  rawText: string
  title: string
  customerName?: string
  categories: string[]
  startAt: string
  endAt?: string | null
  allDay: boolean
}

export type UpdateScheduleInput = CreateScheduleInput & {
  id: number
}

export type CreateScheduleResult =
  | { ok: true; schedule: ScheduleDTO; google: 'synced' | 'authorization_required' | 'unavailable' | 'failed' }
  | { ok: false; error: string }

export async function createSchedule(input: CreateScheduleInput): Promise<CreateScheduleResult> {
  const userId = await getUserId()

  const rawText = String(input.rawText ?? '').trim().slice(0, 1000)
  const title = String(input.title ?? '').trim().slice(0, 300) || rawText.slice(0, 300)
  const customerName = input.customerName ? String(input.customerName).trim().slice(0, 80) : null
  const categories = Array.isArray(input.categories)
    ? [...new Set(input.categories.filter((c) => typeof c === 'string' && VALID_CATEGORY_IDS.has(c)))]
    : []
  const startAt = parseDate(input.startAt)
  const endAt = input.endAt ? parseDate(input.endAt) : null

  if (!rawText) return { ok: false, error: '내용을 입력해 주세요.' }
  if (!startAt) return { ok: false, error: '날짜를 확인해 주세요.' }
  if (endAt && endAt <= startAt) return { ok: false, error: '종료 시간이 시작 시간보다 빨라요.' }

  const [row] = await db
    .insert(schedules)
    .values({
      userId,
      rawText,
      title,
      customerName: customerName || null,
      categories,
      startAt,
      endAt,
      allDay: Boolean(input.allDay),
    })
    .returning()

  const calendar = await getCalendarToken(userId)
  if (calendar.status !== 'connected') {
    return { ok: true, schedule: toDTO(row), google: calendar.status }
  }

  const eventId = await insertCalendarEvent(calendar.token, row)
  const [updated] = await db
    .update(schedules)
    .set({ googleEventId: eventId, syncStatus: eventId ? 'synced' : 'failed' })
    .where(and(eq(schedules.id, row.id), eq(schedules.userId, userId)))
    .returning()

  return { ok: true, schedule: toDTO(updated), google: eventId ? 'synced' : 'failed' }
}

export async function updateSchedule(input: UpdateScheduleInput): Promise<CreateScheduleResult> {
  const userId = await getUserId()

  const rawText = String(input.rawText ?? '').trim().slice(0, 1000)
  const title = String(input.title ?? '').trim().slice(0, 300) || rawText.slice(0, 300)
  const customerName = input.customerName ? String(input.customerName).trim().slice(0, 80) : null
  const categories = Array.isArray(input.categories)
    ? [...new Set(input.categories.filter((c) => typeof c === 'string' && VALID_CATEGORY_IDS.has(c)))]
    : []
  const startAt = parseDate(input.startAt)
  const endAt = input.endAt ? parseDate(input.endAt) : null

  if (!title) return { ok: false, error: '제목을 입력해 주세요.' }
  if (!startAt) return { ok: false, error: '날짜를 확인해 주세요.' }
  if (endAt && endAt <= startAt) return { ok: false, error: '종료 시간이 시작 시간보다 빨라요.' }

  const [row] = await db
    .update(schedules)
    .set({
      rawText: rawText || title,
      title,
      customerName: customerName || null,
      categories,
      startAt,
      endAt,
      allDay: Boolean(input.allDay),
    })
    .where(and(eq(schedules.id, Number(input.id)), eq(schedules.userId, userId)))
    .returning()

  if (!row) return { ok: false, error: '일정을 찾을 수 없습니다.' }

  const calendar = await getCalendarToken(userId)
  if (calendar.status !== 'connected') {
    return { ok: true, schedule: toDTO(row), google: calendar.status }
  }

  let syncOk = false
  let eventId = row.googleEventId

  if (eventId) {
    syncOk = await updateCalendarEvent(calendar.token, eventId, row)
  } else {
    eventId = await insertCalendarEvent(calendar.token, row)
    syncOk = Boolean(eventId)
  }

  const [updated] = await db
    .update(schedules)
    .set({ googleEventId: eventId, syncStatus: syncOk ? 'synced' : 'failed' })
    .where(and(eq(schedules.id, row.id), eq(schedules.userId, userId)))
    .returning()

  return { ok: true, schedule: toDTO(updated), google: syncOk ? 'synced' : 'failed' }
}

export async function setScheduleDone(id: number, done: boolean) {
  const userId = await getUserId()
  await db
    .update(schedules)
    .set({ done: Boolean(done) })
    .where(and(eq(schedules.id, Number(id)), eq(schedules.userId, userId)))
}

export async function deleteSchedule(id: number) {
  const userId = await getUserId()
  const [row] = await db
    .delete(schedules)
    .where(and(eq(schedules.id, Number(id)), eq(schedules.userId, userId)))
    .returning()
  if (row?.googleEventId) {
    const calendar = await getCalendarToken(userId)
    if (calendar.status === 'connected') await deleteCalendarEvent(calendar.token, row.googleEventId)
  }
}

export async function syncPendingSchedules(): Promise<{ synced: number; failed: number; status: string }> {
  const userId = await getUserId()
  const calendar = await getCalendarToken(userId)
  if (calendar.status !== 'connected') return { synced: 0, failed: 0, status: calendar.status }

  const pending = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.userId, userId), ne(schedules.syncStatus, 'synced')))
    .limit(100)

  let synced = 0
  let failed = 0
  for (const row of pending) {
    const eventId = await insertCalendarEvent(calendar.token, row)
    await db
      .update(schedules)
      .set({ googleEventId: eventId, syncStatus: eventId ? 'synced' : 'failed' })
      .where(and(eq(schedules.id, row.id), eq(schedules.userId, userId)))
    if (eventId) synced++
    else failed++
  }
  return { synced, failed, status: 'connected' }
}

export async function countUnsynced(): Promise<number> {
  const userId = await getUserId()
  const rows = await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(and(eq(schedules.userId, userId), ne(schedules.syncStatus, 'synced')))
  return rows.length
}
export async function listAllSchedules(): Promise<ScheduleDTO[]> {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(schedules)
    .where(eq(schedules.userId, userId))
    .orderBy(asc(schedules.startAt))
  return rows.map(toDTO)
}
