import 'server-only'

import crypto from 'crypto'
import { categoryLabels } from '@/lib/categories'
import type { Schedule } from '@/lib/db/schema'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const APP_TIME_ZONE = 'Asia/Seoul'

export type GoogleStatus = 'connected' | 'authorization_required' | 'unavailable'

function getCalendarApiUrl() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export async function getCalendarToken(
  _userId: string,
): Promise<{ status: 'connected'; token: string } | { status: Exclude<GoogleStatus, 'connected'> }> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!clientEmail || !rawPrivateKey) {
    return { status: 'unavailable' }
  }

  try {
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n')
    const now = Math.floor(Date.now() / 1000)

    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const claim = base64UrlEncode(
      JSON.stringify({
        iss: clientEmail,
        scope: CALENDAR_SCOPE,
        aud: TOKEN_URL,
        exp: now + 3600,
        iat: now,
      }),
    )

    const unsignedToken = `${header}.${claim}`
    const signature = crypto
      .createSign('RSA-SHA256')
      .update(unsignedToken)
      .end()
      .sign(privateKey)

    const jwt = `${unsignedToken}.${base64UrlEncode(signature)}`

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[google-calendar] token exchange failed:', res.status, errText)
      return { status: 'unavailable' }
    }

    const data = (await res.json()) as { access_token?: string }
    if (!data.access_token) return { status: 'unavailable' }

    return { status: 'connected', token: data.access_token }
  } catch (error) {
    console.error('[google-calendar] token lookup failed:', error instanceof Error ? error.message : error)
    return { status: 'unavailable' }
  }
}

export async function startCalendarAuthorization(_userId: string) {
  return '/'
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
  const res = await fetch(getCalendarApiUrl(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildEvent(schedule)),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('[google-calendar] insert failed:', res.status, errText)
    return null
  }
  const data = (await res.json()) as { id?: string }
  return data.id ?? null
}

export async function updateCalendarEvent(token: string, eventId: string, schedule: Schedule): Promise<boolean> {
  const res = await fetch(`${getCalendarApiUrl()}/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildEvent(schedule)),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('[google-calendar] update failed:', res.status, errText)
    return false
  }
  return true
}

export async function deleteCalendarEvent(token: string, eventId: string) {
  const res = await fetch(`${getCalendarApiUrl()}/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    console.error('[google-calendar] delete failed:', res.status)
  }
}
