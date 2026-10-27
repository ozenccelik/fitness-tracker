import { useState } from 'react'
import type { AppData, Meal, MealItem } from '../types'
import { WEEKDAYS, today, weekday } from '../lib/dates'
import { num, uid } from '../lib/format'
import { DAY_TYPE_LABEL, mealMacros, sumMacros } from '../lib/nutrition'
import { MealEditor } from './MealEditor'
import { Btn, Card, Segmented } from './ui'

type Update = (fn: (d: AppData) => void) => void

const freshIds = (items: MealItem[]) => structuredClone(items).map((i) => ({ ...i, id: uid() }))

export function PlanPage({ data, update }: { data: AppData; update: Update }) {
  const [wd, setWd] = useState(weekday(today()))
  const day = data.plan.find((p) => p.weekday === wd)!
  const t = data.targets[day.dayType]
  const total = sumMacros(day.meals.map((m) => mealMacros(m, data.foods)))
  const updDay = (fn: (d: AppData['plan'][number]) => void) => update((d) => fn(d.plan.find((p) => p.weekday === wd)!))
  const updMeal = (id: string, fn: (m: Meal) => void) => updDay((p) => fn(p.meals.find((m) => m.id === id)!))

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto">
        {WEEKDAYS.map((name, i) => (
          <button key={name} type="button" onClick={() => setWd(i)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${i === wd ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200'}`}>
            {name.slice(0, 3)}
          </button>
        ))}
      </div>

      <Card title={`${WEEKDAYS[wd]} planı`}>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-stone-500">Varsayılan gün türü (günlük kayıtta değiştirebilirsin)</div>
            <Segmented value={day.dayType} options={(['rest', 'weights', 'run'] as const).map((v) => ({ value: v, label: DAY_TYPE_LABEL[v].replace(' antrenmanı', '') }))} onChange={(v) => updDay((p) => void (p.dayType = v))} />
          </div>
          <p className="text-sm tabular-nums">
            Plan toplamı: <b>{num(total.kcal)} kcal</b> (hedef {num(t.kcalMin)}–{num(t.kcalMax)}) · <b>{num(total.protein)} g protein</b> (hedef {num(t.proteinMin)}–{num(t.proteinMax)}) · K {num(total.carb)} g · Y {num(total.fat)} g
          </p>
          {(total.kcal < t.kcalMin || total.kcal > t.kcalMax || total.protein < t.proteinMin) && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Bu planın hesaplanan değerleri hedef aralığın dışında. Değerler tahmini; gerekirse miktarları ya da hedefleri düzenle.
            </p>
          )}
          <p className="text-xs text-stone-500">Tahıllar kuru, et/tavuk/hindi çiğ ağırlıktır. Plan değişiklikleri geçmiş günlerin kayıtlarını etkilemez.</p>
        </div>
      </Card>

      {day.meals.map((m) => {
        const mm = mealMacros(m, data.foods)
        return (
          <Card
            key={m.id}
            title={
              <span className="flex flex-wrap gap-2">
                <input value={m.name} onChange={(e) => updMeal(m.id, (x) => void (x.name = e.target.value))} className="rounded border border-transparent px-1 font-semibold hover:border-stone-200" aria-label="Öğün adı" />
                <input value={m.time} onChange={(e) => updMeal(m.id, (x) => void (x.time = e.target.value))} className="w-28 rounded border border-transparent px-1 text-xs font-normal text-stone-500 hover:border-stone-200" aria-label="Saat" />
              </span>
            }
            right={<span className="shrink-0 text-xs tabular-nums text-stone-600">{num(mm.kcal)} kcal · {num(mm.protein)} g P</span>}
          >
            <MealEditor items={m.items} foods={data.foods} onChange={(items) => updMeal(m.id, (x) => void (x.items = items))} />
            <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
              <select
                value=""
                onChange={(e) => {
                  const target = Number(e.target.value)
                  update((d) => void d.plan.find((p) => p.weekday === target)!.meals.push({ ...structuredClone(m), id: uid(), items: freshIds(m.items) }))
                  alert(`"${m.name}" ${WEEKDAYS[target]} gününe kopyalandı.`)
                }}
                className="rounded-lg bg-stone-100 px-2 py-1.5 text-sm"
                aria-label="Başka güne kopyala"
              >
                <option value="">Başka güne kopyala…</option>
                {WEEKDAYS.map((n, i) => i !== wd && <option key={n} value={i}>{n}</option>)}
              </select>
              <Btn onClick={() => {
                const name = prompt('Alternatif tarif adı', m.name)
                if (name) update((d) => void d.recipes.push({ id: uid(), name, items: freshIds(m.items) }))
              }}>Alternatif olarak kaydet</Btn>
              <Btn tone="danger" onClick={() => confirm(`"${m.name}" silinsin mi?`) && updDay((p) => void (p.meals = p.meals.filter((x) => x.id !== m.id)))}>Öğünü sil</Btn>
            </div>
          </Card>
        )
      })}
      <Btn onClick={() => updDay((p) => void p.meals.push({ id: uid(), name: 'Yeni öğün', time: '', items: [] }))} className="w-full">+ Öğün ekle</Btn>

      <h2 className="pt-4 text-sm font-semibold text-stone-700">Alternatif tarifler</h2>
      <p className="text-xs text-stone-500">Bugün ekranında bir öğünün yerine seçebilirsin. Yeni tarif için bir öğünü "Alternatif olarak kaydet" ya da boş tarif ekle.</p>
      {data.recipes.map((r) => {
        const updR = (fn: (x: typeof r) => void) => update((d) => fn(d.recipes.find((x) => x.id === r.id)!))
        const rm = mealMacros(r, data.foods)
        return (
          <Card
            key={r.id}
            title={<input value={r.name} onChange={(e) => updR((x) => void (x.name = e.target.value))} className="rounded border border-transparent px-1 font-semibold hover:border-stone-200" aria-label="Tarif adı" />}
            right={<span className="text-xs tabular-nums text-stone-600">{num(rm.kcal)} kcal · {num(rm.protein)} g P</span>}
          >
            <MealEditor items={r.items} foods={data.foods} onChange={(items) => updR((x) => void (x.items = items))} />
            <Btn tone="danger" className="mt-3" onClick={() => confirm(`"${r.name}" silinsin mi?`) && update((d) => void (d.recipes = d.recipes.filter((x) => x.id !== r.id)))}>Tarifi sil</Btn>
          </Card>
        )
      })}
      <Btn onClick={() => update((d) => void d.recipes.push({ id: uid(), name: 'Yeni ara öğün', items: [] }))} className="w-full">+ Boş tarif ekle</Btn>
    </div>
  )
}
