import { cn } from '@/lib/utils'
import { getCategory } from '@/lib/categories'

export function CategoryBadges({ ids, className }: { ids: string[]; className?: string }) {
  if (!ids.length) return null
  return (
    <ul className={cn('flex flex-wrap gap-1', className)} aria-label="분류">
      {ids.map((id) => {
        const c = getCategory(id)
        if (!c) return null
        return (
          <li
            key={id}
            className={cn('inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium', c.className)}
          >
            {c.label}
          </li>
        )
      })}
    </ul>
  )
}
