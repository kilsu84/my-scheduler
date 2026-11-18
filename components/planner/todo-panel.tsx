'use client'

import { useState } from 'react'
import { Flag, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { addTodo, deleteTodo, setTodoDone, type TodoDTO } from '@/app/actions/todos'
import { useRefreshPlanner, useTodayTodos } from '@/hooks/use-planner-data'

function TodoRow({ todo, today }: { todo: TodoDTO; today: string }) {
  const refresh = useRefreshPlanner()
  const carried = todo.dueDate < today

  return (
    <li className="group flex items-center gap-3 py-2.5">
      <Checkbox
        checked={todo.done}
        onCheckedChange={async (checked) => {
          await setTodoDone(todo.id, Boolean(checked))
          await refresh.todos()
        }}
        aria-label={`${todo.title} 완료 표시`}
      />
      <span className={cn('flex-1 text-sm text-pretty', todo.done && 'text-muted-foreground line-through')}>
        {todo.priority === 'high' && <Flag className="mr-1 inline size-3.5 text-destructive" aria-label="중요" />}
        {todo.title}
      </span>
      {carried && !todo.done && (
        <span className="rounded-full bg-cat-unpurchased px-2 py-0.5 text-[11px] font-medium text-cat-unpurchased-foreground">
          이월
        </span>
      )}
      <button
        type="button"
        onClick={async () => {
          await deleteTodo(todo.id)
          await refresh.todos()
        }}
        className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
        aria-label={`${todo.title} 삭제`}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </li>
  )
}

export function TodoPanel({ today }: { today: string }) {
  const { data: todos, isLoading } = useTodayTodos(today)
  const refresh = useRefreshPlanner()
  const [title, setTitle] = useState('')
  const [important, setImportant] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const result = await addTodo(title, today, important ? 'high' : 'normal')
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setTitle('')
    setImportant(false)
    await refresh.todos()
  }

  const remaining = todos?.filter((t) => !t.done).length ?? 0
  const total = todos?.length ?? 0

  return (
    <section aria-labelledby="todo-title" className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 id="todo-title" className="font-serif text-lg font-bold">
          오늘의 할 일
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {total - remaining}/{total} 완료
        </span>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <label htmlFor="todo-input" className="sr-only">
          할 일 추가
        </label>
        <Input
          id="todo-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일을 적고 Enter"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-pressed={important}
          aria-label="중요 표시"
          onClick={() => setImportant((v) => !v)}
          className={cn(important && 'border-destructive text-destructive')}
        >
          <Flag className="size-4" aria-hidden="true" />
        </Button>
        <Button type="submit" size="icon" aria-label="추가">
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </form>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">불러오는 중…</p>
      ) : total === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">오늘 할 일을 추가해 보세요.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {todos!.map((t) => (
            <TodoRow key={t.id} todo={t} today={today} />
          ))}
        </ul>
      )}
    </section>
  )
}
