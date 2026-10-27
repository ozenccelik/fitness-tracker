import type { Food, MealItem } from '../types'
import { num, uid } from '../lib/format'
import { itemMacros } from '../lib/nutrition'
import { Badge, NumField } from './ui'

export const foodLabel = (f: Food) => (f.state ? `${f.name} (${f.state})` : f.name)

/** Read-only item list with per-item kcal/protein. */
export function ItemList({ items, foods }: { items: MealItem[]; foods: Food[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {items.map((it) => {
        const food = foods.find((f) => f.id === it.foodId)
        const m = itemMacros(it, foods)
        return (
          <li key={it.id} className="flex items-baseline justify-between gap-2">
            <span>
              <span className="tabular-nums text-stone-500">{num(it.amount)} {it.unit}</span>{' '}
              {food ? foodLabel(food) : 'Silinmiş besin'}
              {it.assumption && <span className="ml-1"><Badge tone="amber">varsayım: {it.assumption}</Badge></span>}
            </span>
            <span className="shrink-0 tabular-nums text-xs text-stone-500">{num(m.kcal)} kcal · {num(m.protein)} g P</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Editable item list; every change returns a new array. */
export function MealEditor({ items, foods, onChange }: { items: MealItem[]; foods: Food[]; onChange: (items: MealItem[]) => void }) {
  const set = (id: string, patch: Partial<MealItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const food = foods.find((f) => f.id === it.foodId)
        return (
          <div key={it.id} className="flex flex-wrap items-center gap-2 text-sm">
            <select
              value={it.foodId}
              onChange={(e) => set(it.id, { foodId: e.target.value, unit: foods.find((f) => f.id === e.target.value)?.gramsPerUnit ? it.unit : 'g' })}
              className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5"
              aria-label="Besin"
            >
              {foods.map((f) => <option key={f.id} value={f.id}>{foodLabel(f)}</option>)}
            </select>
            <NumField value={it.amount} digits={0} onCommit={(v) => v !== undefined && v >= 0 && set(it.id, { amount: v, assumption: undefined })} className="w-20" aria-label="Miktar" />
            {food?.gramsPerUnit ? (
              <select value={it.unit} onChange={(e) => set(it.id, { unit: e.target.value as MealItem['unit'] })} className="rounded-lg border border-stone-300 bg-white px-1 py-1.5" aria-label="Birim">
                <option value="g">g</option>
                <option value="adet">adet</option>
              </select>
            ) : <span className="w-8 text-stone-500">g</span>}
            <button type="button" onClick={() => onChange(items.filter((i) => i.id !== it.id))} className="px-1 text-stone-400 hover:text-red-600" aria-label="Besini sil">✕</button>
          </div>
        )
      })}
      <button type="button" onClick={() => onChange([...items, { id: uid(), foodId: foods[0].id, amount: 100, unit: 'g' }])} className="text-sm font-medium text-stone-600 hover:text-stone-900">
        + Besin ekle
      </button>
    </div>
  )
}
