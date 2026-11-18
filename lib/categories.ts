export type CategoryId =
  | 'customer'
  | 'work'
  | 'meeting'
  | 'personal'
  | 'gift'
  | 'delivery'
  | 'payment'
  | 'change'
  | 'appointment'
  | 'unpurchased'

export type Category = { id: CategoryId; label: string; className: string }

export const MAIN_CATEGORIES: Category[] = [
  { id: 'customer', label: '고객', className: 'bg-primary text-primary-foreground border-primary' },
  { id: 'work', label: '업무', className: 'bg-secondary text-secondary-foreground border-border' },
  { id: 'meeting', label: '회의', className: 'bg-secondary text-secondary-foreground border-border' },
  { id: 'personal', label: '개인', className: 'bg-secondary text-secondary-foreground border-border' },
]

export const CUSTOMER_SUBCATEGORIES: Category[] = [
  { id: 'gift', label: '사은품', className: 'bg-cat-gift text-cat-gift-foreground border-transparent' },
  { id: 'delivery', label: '배송', className: 'bg-cat-delivery text-cat-delivery-foreground border-transparent' },
  { id: 'payment', label: '결제', className: 'bg-cat-payment text-cat-payment-foreground border-transparent' },
  { id: 'change', label: '변경', className: 'bg-cat-change text-cat-change-foreground border-transparent' },
  { id: 'appointment', label: '약속', className: 'bg-cat-appointment text-cat-appointment-foreground border-transparent' },
  { id: 'unpurchased', label: '미구매', className: 'bg-cat-unpurchased text-cat-unpurchased-foreground border-transparent' },
]

export const ALL_CATEGORIES = [...MAIN_CATEGORIES, ...CUSTOMER_SUBCATEGORIES]
const CATEGORY_MAP = new Map(ALL_CATEGORIES.map((c) => [c.id, c]))
export const VALID_CATEGORY_IDS = new Set<string>(ALL_CATEGORIES.map((c) => c.id))

export function getCategory(id: string) {
  return CATEGORY_MAP.get(id as CategoryId)
}

export function categoryLabels(ids: string[]) {
  return ids.map((id) => getCategory(id)?.label).filter(Boolean) as string[]
}
