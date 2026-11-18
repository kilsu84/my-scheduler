'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CUSTOMER_SUBCATEGORIES, MAIN_CATEGORIES, type Category } from '@/lib/categories'

type Props = {
  selected: string[]
  onChange: (next: string[]) => void
}

function Chip({ category, active, onToggle }: { category: Category; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        active ? category.className : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {active && <Check className="size-3.5" aria-hidden="true" />}
      {category.label}
    </button>
  )
}

export function CategoryPicker({ selected, onChange }: Props) {
  const isCustomer = selected.includes('customer')

  function toggle(id: string) {
    if (selected.includes(id)) {
      const next = selected.filter((s) => s !== id)
      onChange(id === 'customer' ? next.filter((s) => !CUSTOMER_SUBCATEGORIES.some((c) => c.id === s)) : next)
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="분류" className="flex flex-wrap gap-2">
        {MAIN_CATEGORIES.map((c) => (
          <Chip key={c.id} category={c} active={selected.includes(c.id)} onToggle={() => toggle(c.id)} />
        ))}
      </div>
      {isCustomer && (
        <div className="flex flex-col gap-2 rounded-xl bg-secondary/70 p-3">
          <p className="text-xs font-medium text-muted-foreground">고객 건 세부 항목 · 여러 개 선택 가능</p>
          <div role="group" aria-label="고객 세부 항목" className="flex flex-wrap gap-2">
            {CUSTOMER_SUBCATEGORIES.map((c) => (
              <Chip key={c.id} category={c} active={selected.includes(c.id)} onToggle={() => toggle(c.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
