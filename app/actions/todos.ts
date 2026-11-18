'use server'

import { and, asc, desc, eq, gte, lt, lte, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { todos, type Todo } from '@/lib/db/schema'
import { getUserId } from '@/lib/session'

export type TodoDTO = Omit<Todo, 'createdAt' | 'userId'> & { createdAt: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PRIORITIES = new Set(['high', 'normal'])

function toDTO(t: Todo): TodoDTO {
  return {
    id: t.id,
    title: t.title,
    done: t.done,
    dueDate: t.dueDate,
    priority: t.priority,
    createdAt: t.createdAt.toISOString(),
  }
}

function assertDate(value: string) {
  if (!DATE_RE.test(value)) throw new Error('Invalid date')
  return value
}

/** Today's to-dos plus any unfinished items carried over from earlier days. */
export async function listTodosForDay(day: string): Promise<TodoDTO[]> {
  const userId = await getUserId()
  const date = assertDate(day)
  const rows = await db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        or(eq(todos.dueDate, date), and(lt(todos.dueDate, date), eq(todos.done, false))),
      ),
    )
    .orderBy(asc(todos.done), desc(todos.priority), asc(todos.createdAt))
  return rows.map(toDTO)
}

export async function listTodosInRange(fromDay: string, toDay: string): Promise<TodoDTO[]> {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(todos)
    .where(and(eq(todos.userId, userId), gte(todos.dueDate, assertDate(fromDay)), lte(todos.dueDate, assertDate(toDay))))
    .orderBy(asc(todos.dueDate), asc(todos.createdAt))
  return rows.map(toDTO)
}

export async function addTodo(title: string, dueDate: string, priority: string = 'normal') {
  const userId = await getUserId()
  const clean = String(title ?? '').trim().slice(0, 300)
  if (!clean) return { ok: false as const, error: '할 일을 입력해 주세요.' }
  const [row] = await db
    .insert(todos)
    .values({
      userId,
      title: clean,
      dueDate: assertDate(dueDate),
      priority: PRIORITIES.has(priority) ? priority : 'normal',
    })
    .returning()
  return { ok: true as const, todo: toDTO(row) }
}

export async function setTodoDone(id: number, done: boolean) {
  const userId = await getUserId()
  await db
    .update(todos)
    .set({ done: Boolean(done) })
    .where(and(eq(todos.id, Number(id)), eq(todos.userId, userId)))
}

export async function deleteTodo(id: number) {
  const userId = await getUserId()
  await db.delete(todos).where(and(eq(todos.id, Number(id)), eq(todos.userId, userId)))
}
