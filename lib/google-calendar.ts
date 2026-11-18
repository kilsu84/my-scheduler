import 'server-only'

import {
  getToken,
  startAuthorization,
  UserAuthorizationRequiredError,
  NoValidTokenError,
  type ConnectTokenParams,
} from '@vercel/connect'
import { headers } from 'next/headers'
import { categoryLabels } from '@/lib/categories'
import type { Schedule } from '@/lib/db/schema'

const GOOGLE_CONNECTOR_UID = 'google/my-secretary-calendar'
const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events']
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
export const APP_TIME_ZONE = 'Asia/Seoul'

function tokenParams(userId: string): ConnectTokenParams {
  return { subject: { type: 'user', id: userId }, scopes: CALENDAR_SCOPES }
}

export type GoogleStatus = 'connected' | 'authorization_required' | 'unavailable'

export async function getCalendarToken(
  userId: string,
): Promise<{ status: 'connected'; token: string } | { status: Exclude<GoogleStatus, 'connected'> }> {
  try {
    const token = await getToken(GOOGLE_CONNECTOR_UID, tokenParams(userId))
    return { status: 'connected', token }
  } catch (error) {
    if (error instanceof UserAuthorizationRequiredError || error instanceof NoValidTokenError) {
      return { status: 'authorization_required' }
    }
    console.error('[google-calendar] token lookup failed:', error instanceof Error ? error.message : error)
    return { status: 'unavailable' }
  }
}

async function getOrigin(): Promise<string> {
  if (process.env.NODE_ENV !== 'production' && process.env.V0_RUNTIME_URL) return process.env.V0_RUNTIME_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  return `${h.get('x-forwarded-proto') ?? 'https'}://${host}`
}

export async function startCalendarAuthorization(userId: string) {
  const origin = await getOrigin()
  const { url } = await startAuthorization(GOOGLE_CONNECTOR_UID, tokenParams(userId), {
    callbackUrl: `${origin}/?google=connected`,
  })
  return url
}

function toSeoulDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function nextDay(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function buildEvent(schedule: Schedule) {
  const labels = categoryLabels(schedule.categories)
  const prefix = labels.length ? `[${labels.join('/')}] ` : ''
  const customer = schedule.customerName ? `${schedule.customerName} · ` : ''
  const summary = `${prefix}${customer}${schedule.title}`.slice(0, 250)
  const description = [
    labels.length ? `분류: ${labels.join(', ')}` : null,
    schedule.customerName ? `고객: ${schedule.customerName}` : null,
    `원문: ${schedule.rawText}`,
    '— 나의 비서에서 등록됨',
  ]
    .filter(Boolean)
    .join('\n')

  if (schedule.allDay) {
    const day = toSeoulDate(schedule.startAt)
    return {
      summary,
      description,
      start: { date: day },
      end: { date: nextDay(day) },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 15 * 60 }] },
    }
  }

  const end = schedule.endAt ?? new Date(schedule.startAt.getTime() + 60 * 60 * 1000)
  return {
    summary,
    description,
    start: { dateTime: schedule.startAt.toISOString(), timeZone: APP_TIME_ZONE },
    end: { dateTime: end.toISOString(), timeZone: APP_TIME_ZONE },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 10 },
      ],
    },
  }
}

export async function insertCalendarEvent(token: string, schedule: Schedule): Promise<string | null> {
  const res = await fetch(CALENDAR_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildEvent(schedule)),
  })
  if (!res.ok) {
    console.error('[google-calendar] insert failed:', res.status)
    return null
  }
  const data = (await res.json()) as { id?: string }
  return data.id ?? null
}

export async function deleteCalendarEvent(token: string, eventId: string) {
  const res = await fetch(`${CALENDAR_API}/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    console.error('[google-calendar] delete failed:', res.status)
  }
}
