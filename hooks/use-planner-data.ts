'use client'

import useSWR, { useSWRConfig } from 'swr'
import { countUnsynced, listSchedules } from '@/app/actions/schedules'
import { listTodosForDay, listTodosInRange } from '@/app/actions/todos'
import { getGoogleStatus } from '@/app/actions/google'

export function useSchedules(from: Date, to: Date) {
  return useSWR(['schedules', from.toISOString(), to.toISOString()], ([, f, t]) => listSchedules(f, t), {
    refreshInterval: 60_000,
  })
}

export function useTodayTodos(day: string) {
  return useSWR(['todos-day', day], ([, d]) => listTodosForDay(d))
}

export function useTodosInRange(from: string, to: string) {
  return useSWR(['todos-range', from, to], ([, f, t]) => listTodosInRange(f, t))
}

export function useGoogleStatus() {
  return useSWR('google-status', () => getGoogleStatus(), { revalidateOnFocus: true })
}

export function useUnsyncedCount() {
  return useSWR('unsynced-count', () => countUnsynced())
}

export function useRefreshPlanner() {
  const { mutate } = useSWRConfig()
  return {
    schedules: () =>
      Promise.all([
        mutate((key) => Array.isArray(key) && key[0] === 'schedules'),
        mutate('unsynced-count'),
      ]),
    todos: () => mutate((key) => Array.isArray(key) && (key[0] === 'todos-day' || key[0] === 'todos-range')),
    google: () => Promise.all([mutate('google-status'), mutate('unsynced-count')]),
  }
}
