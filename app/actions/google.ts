'use server'

import { getUserId } from '@/lib/session'
import { getCalendarToken, startCalendarAuthorization, type GoogleStatus } from '@/lib/google-calendar'

export async function getGoogleStatus(): Promise<GoogleStatus> {
  const userId = await getUserId()
  const result = await getCalendarToken(userId)
  return result.status
}

export async function connectGoogleCalendar(): Promise<{ url: string } | { error: string }> {
  const userId = await getUserId()
  try {
    return { url: await startCalendarAuthorization(userId) }
  } catch (error) {
    console.error('[google] start authorization failed:', error instanceof Error ? error.message : error)
    return { error: '구글 캘린더 연결을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.' }
  }
}
