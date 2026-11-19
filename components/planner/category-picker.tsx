'use client'

import { cn } from '@/lib/utils'
import { CUSTOMER_SUBCATEGORIES, MAIN_CATEGORIES } from '@/lib/categories'

export function CategoryPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((c) => c !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="flex flex-col gap-2.5" role="group" aria-label="카테고리 선택">
      <div className="flex flex-wrap gap-1.5">
        {MAIN_CATEGORIES.map((cat) => {
          const active = selected.includes(cat.id)
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggle(cat.id)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors sm:text-sm',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-background text-foreground hover:bg-secondary',
              )}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CUSTOMER_SUBCATEGORIES.map((cat) => {
          const active = selected.includes(cat.id)
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggle(cat.id)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground',
              )}
            >
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
