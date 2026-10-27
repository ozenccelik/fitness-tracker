import { useState } from 'react'
import type { AppData, DayLog, Food, ISODate, MealLog, MealStatus, Recipe, Workout } from '../types'
import { addDays, fmtLong, today, weekday } from '../lib/dates'
import { num, signed, uid } from '../lib/format'
import { DAY_TYPE_LABEL, compliance, dayIntake, dayTypeFor, mealLogMacros, mealMacros, snapshotMeals, targetFor } from '../lib/nutrition'
import { fmtPace, pace, weekReports, weighInStreak, complianceStreak } from '../lib/progress'
import { measurements, previousDiff, weekOf } from '../lib/weight'
import { ItemList, MealEditor } from './MealEditor'
import { WeightChart } from './Charts'
import { Badge, Btn, Card, NumField, Progress, Segmented } from './ui'

type Update = (fn: (d: AppData) => void) => void

const dayOf = (d: AppData, date: ISODate): DayLog => (d.days[date] ??= { date })

export function Today({ data, update, date, setDate }: { data: AppData; update: Update; date: ISODate; setDate: (d: ISODate) => void }) {
  const day = data.days[date]
  const isToday = date === today()
  const updDay = (fn: (day: DayLog) => void) => update((d) => fn(dayOf(d, date)))
  /** Meals are snapshotted from the plan on first touch, so later plan edits leave this day alone. */
  const updMeal = (id: string, fn: (m: MealLog) => void) =>
    update((d) => {
      const dl = dayOf(d, date)
      dl.meals ??= snapshotMeals(d, date)
      const m = dl.meals.find((x) => x.id === id)
      if (m) fn(m)
    })

  const meals: MealLog[] = day?.meals ?? snapshotMeals(data, date)
  const intake = dayIntake(day, data.foods)
  const target = targetFor(data, date)
  const comp = compliance(intake, target)
  const workouts = data.workouts.filter((w) => w.date === date)
  const planNote = data.plan.find((p) => p.weekday === weekday(date))?.note

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setDate(addDays(date, -1))} className="rounded-lg px-3 py-2 text-lg text-stone-500 hover:bg-stone-200" aria-label="Önceki gün">‹</button>
        <div className="text-center">
          <div className="font-semibold">{fmtLong(date)}</div>
          {!isToday && <button type="button" onClick={() => setDate(today())} className="text-xs text-sky-700 underline">Bugüne dön</button>}
        </div>
        <button type="button" onClick={() => setDate(addDays(date, 1))} className="rounded-lg px-3 py-2 text-lg text-stone-500 hover:bg-stone-200" aria-label="Sonraki gün">›</button>
      </div>

      <WeightCard data={data} date={date} day={day} updDay={updDay} />

      <Card title="Günün özeti" right={<Badge>{intake ? `${intake.done}/${intake.total} öğün işaretli` : 'öğün işaretlenmedi'}</Badge>}>
        <div className="space-y-3">
          <Segmented
            value={dayTypeFor(data, date)}
            options={(['rest', 'weights', 'run'] as const).map((t) => ({ value: t, label: DAY_TYPE_LABEL[t].replace(' antrenmanı', '') }))}
            onChange={(t) => updDay((d) => void (d.dayType = t))}
          />
          <Progress label="Kalori" value={intake ? intake.macros.kcal : null} min={target.kcalMin} max={target.kcalMax} unit="kcal" />
          <Progress label="Protein" value={intake ? intake.macros.protein : null} min={target.proteinMin} max={target.proteinMax} unit="g" />
          <p className="text-xs text-stone-500">
            {comp
              ? comp.ok ? '✓ Kalori ve protein hedefe uygun.' : `Kalori ${({ under: 'hedefin altında', ok: 'hedefte', over: 'hedefin üstünde' })[comp.kcal]}, protein ${comp.protein === 'ok' ? 'hedefte' : 'hedefin altında'}.`
              : 'Uyum, tüm öğünler işaretlenince hesaplanır (yedim / atladım / farklı).'}
            {intake && ` Karbonhidrat ${num(intake.macros.carb)} g · Yağ ${num(intake.macros.fat)} g.`}
          </p>
        </div>
      </Card>

      {planNote && <p className="rounded-xl bg-sky-50 px-4 py-2 text-sm text-sky-900">{planNote}</p>}

      {meals.map((m) => (
        <MealCard
          key={m.id}
          meal={m}
          foods={data.foods}
          recipes={data.recipes}
          setStatus={(s) => updMeal(m.id, (x) => void (x.status = s))}
          setItems={(items) => updMeal(m.id, (x) => void (x.items = items))}
          setManual={(k, p) => updMeal(m.id, (x) => { x.manualKcal = k; x.manualProtein = p })}
          applyRecipe={(r) => updMeal(m.id, (x) => { x.items = structuredClone(r.items); x.name = `${x.name} · ${r.name}` })}
        />
      ))}
      <p className="text-xs text-stone-500">
        Tahıl gramajları (pirinç, bulgur, makarna, yulaf) kuru, et/tavuk/hindi gramajları çiğ ağırlıktır; patates ve sebze tarifteki ağırlıktır.
        Besin değerleri tahminidir, Ayarlar › Besinler'den etiket değerleriyle düzeltebilirsin.
      </p>

      <ActivityCard data={data} date={date} workouts={workouts} update={update} />
      <DailyCard data={data} day={day} updDay={updDay} />
      <WeekGlance data={data} date={date} />
    </div>
  )
}

function WeightCard({ data, date, day, updDay }: { data: AppData; date: ISODate; day?: DayLog; updDay: (fn: (d: DayLog) => void) => void }) {
  const pts = measurements(data.days)
  const last = pts.filter((p) => p.date <= date).at(-1)
  const diff = previousDiff(pts, date)
  const reports = weekReports(data, date)
  const prevWeek = reports[reports.indexOf(weekOf(reports, date)!) - 1]
  return (
    <Card title="Sabah kilosu" right={<span className="text-xs text-stone-500">Seri: {weighInStreak(data, today())} gün</span>}>
      <div className="flex items-center gap-3">
        <NumField
          value={day?.weight}
          digits={1}
          placeholder="kg"
          aria-label="Sabah kilosu (kg)"
          onCommit={(v) => {
            if (v !== undefined && (v < 30 || v > 300)) return alert('Kilo 30–300 kg arasında olmalı.')
            updDay((d) => void (d.weight = v))
          }}
          className="w-36 py-3 text-center text-3xl font-semibold"
        />
        <div className="text-sm text-stone-600">
          {day?.weight !== undefined ? (
            <>
              {diff ? <div><b className="tabular-nums">{signed(diff.diff)} kg</b> {diff.gapDays === 1 ? 'dünden' : `son ölçümden (${diff.gapDays} gün önce)`}</div> : <div>İlk ölçüm</div>}
              {prevWeek?.avg !== undefined && (
                <div>Geçen hafta ort. {num(prevWeek.avg, 1)} kg → <b className="tabular-nums">{signed(day.weight - prevWeek.avg)} kg</b></div>
              )}
            </>
          ) : last ? (
            <div>Son kayıt: <b>{num(last.weight, 1)} kg</b></div>
          ) : (
            <div>Henüz kilo girilmedi.</div>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-500">Mümkünse sabah, tuvalet sonrası ve yemekten önce tart. Koşullar tutmasa da kaydet; eğilimi haftalık ortalama gösterir, günlük dalgalanma yağ kaybı değildir.</p>
      <input
        value={day?.weightNote ?? ''}
        onChange={(e) => updDay((d) => void (d.weightNote = e.target.value || undefined))}
        placeholder="Kilo notu (isteğe bağlı)"
        className="mt-2 w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
      />
    </Card>
  )
}

const STATUS: { value: MealStatus; label: string }[] = [
  { value: 'eaten', label: 'Yedim' },
  { value: 'different', label: 'Farklı' },
  { value: 'skipped', label: 'Atladım' },
]

function MealCard({ meal, foods, recipes, setStatus, setItems, setManual, applyRecipe }: {
  meal: MealLog
  foods: Food[]
  recipes: Recipe[]
  setStatus: (s: MealStatus) => void
  setItems: (items: MealLog['items']) => void
  setManual: (kcal: number | undefined, protein: number | undefined) => void
  applyRecipe: (r: Recipe) => void
}) {
  const [editing, setEditing] = useState(false)
  const planned = mealMacros(meal, foods)
  const eaten = mealLogMacros(meal, foods)
  const border = { pending: 'ring-stone-200', eaten: 'ring-emerald-300', different: 'ring-sky-300', skipped: 'ring-stone-300 opacity-70' }[meal.status]
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${border}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="font-semibold">{meal.name}</h3>
          <div className="text-xs text-stone-500">{meal.time}</div>
        </div>
        <div className="text-right text-sm tabular-nums">
          <b>{num(meal.status === 'pending' ? planned.kcal : eaten.kcal)} kcal</b>
          <div className="text-xs text-stone-500">{num(meal.status === 'pending' ? planned.protein : eaten.protein)} g protein</div>
        </div>
      </div>
      {editing ? <MealEditor items={meal.items} foods={foods} onChange={setItems} /> : <ItemList items={meal.items} foods={foods} />}
      {meal.status === 'different' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-sky-50 p-2 text-sm">
          <span className="text-sky-900">Gerçekte aldığın:</span>
          <NumField value={meal.manualKcal} onCommit={(v) => setManual(v, meal.manualProtein)} placeholder={num(planned.kcal)} className="w-20" aria-label="Gerçek kalori" /> kcal
          <NumField value={meal.manualProtein} onCommit={(v) => setManual(meal.manualKcal, v)} placeholder={num(planned.protein)} className="w-16" aria-label="Gerçek protein" /> g P
          <span className="w-full text-xs text-sky-800">Boş bırakırsan besinlerden hesaplanır; miktarları da düzenleyebilirsin.</span>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex-1">
          <Segmented size="sm" value={meal.status} options={STATUS} onChange={(s) => setStatus(s === meal.status ? 'pending' : s)} />
        </div>
        <Btn onClick={() => setEditing(!editing)}>{editing ? 'Bitti' : 'Düzenle'}</Btn>
        {recipes.length > 0 && (
          <select value="" onChange={(e) => { const r = recipes.find((x) => x.id === e.target.value); if (r) applyRecipe(r) }} className="rounded-lg bg-stone-100 px-2 py-1.5 text-sm" aria-label="Alternatif tarif">
            <option value="">Alternatif…</option>
            {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
      </div>
    </section>
  )
}

function ActivityCard({ data, date, workouts, update }: { data: AppData; date: ISODate; workouts: Workout[]; update: Update }) {
  const add = (w: Omit<Workout, 'id' | 'date'>) => update((d) => void d.workouts.push({ id: uid(), date, ...w }))
  const patch = (id: string, p: Partial<Workout>) => update((d) => { const w = d.workouts.find((x) => x.id === id); if (w) Object.assign(w, p) })
  const remove = (id: string) => update((d) => void (d.workouts = d.workouts.filter((x) => x.id !== id)))
  return (
    <Card title="Antrenman" right={<span className="text-xs text-stone-500">Hedef: haftada {data.profile.weeklyWeightsTarget} ağırlık · {data.profile.weeklyRunTarget} koşu</span>}>
      <div className="space-y-3">
        {workouts.map((w) => (
          <div key={w.id} className="rounded-xl bg-stone-50 p-3 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <b>{w.kind === 'run' ? '🏃 Koşu' : '🏋️ Ağırlık antrenmanı'}</b>
              <button type="button" onClick={() => remove(w.id)} className="text-xs text-stone-400 hover:text-red-600">Sil</button>
            </div>
            {w.kind === 'run' ? (
              <div className="flex flex-wrap items-center gap-2">
                <NumField value={w.distanceKm} digits={2} onCommit={(v) => patch(w.id, { distanceKm: v })} className="w-20" aria-label="Mesafe (km)" /> km
                <NumField value={w.durationMin} onCommit={(v) => patch(w.id, { durationMin: v })} className="w-20" aria-label="Süre (dk)" /> dk
                <label className="flex items-center gap-1"><input type="checkbox" checked={!!w.fasted} onChange={(e) => patch(w.id, { fasted: e.target.checked })} /> aç karnına</label>
                <span className="text-stone-600">Tempo: <b>{pace(w) ? fmtPace(pace(w)!) : '—'}</b></span>
              </div>
            ) : (
              <input value={w.label ?? ''} onChange={(e) => patch(w.id, { label: e.target.value || undefined })} placeholder="Etiket (örn. Üst vücut)" className="w-full rounded-lg border border-stone-200 px-2 py-1.5" />
            )}
            <input value={w.note ?? ''} onChange={(e) => patch(w.id, { note: e.target.value || undefined })} placeholder="Not" className="mt-2 w-full rounded-lg border border-stone-200 px-2 py-1.5" />
          </div>
        ))}
        <div className="flex gap-2">
          <Btn onClick={() => add({ kind: 'weights' })} className="flex-1">+ Ağırlık antrenmanı</Btn>
          <Btn onClick={() => add({ kind: 'run', fasted: true })} className="flex-1">+ Koşu</Btn>
        </div>
      </div>
    </Card>
  )
}

function DailyCard({ data, day, updDay }: { data: AppData; day?: DayLog; updDay: (fn: (d: DayLog) => void) => void }) {
  const water = day?.waterL ?? 0
  const setWater = (v: number) => updDay((d) => void (d.waterL = Math.max(0, Math.round(v * 100) / 100) || undefined))
  const scale = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))
  return (
    <Card title="Günlük">
      <div className="space-y-4 text-sm">
        <div>
          <div className="mb-1 flex justify-between"><span className="text-stone-600">Su</span><span className="tabular-nums"><b>{num(water, 2)} L</b> / {num(data.profile.waterTargetL, 1)} L</span></div>
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, (water / data.profile.waterTargetL) * 100)}%` }} /></div>
          <div className="flex gap-2">
            <Btn onClick={() => setWater(water - 0.25)}>−0,25</Btn>
            <Btn onClick={() => setWater(water + 0.25)} className="flex-1">+0,25 L</Btn>
            <Btn onClick={() => setWater(water + 0.5)} className="flex-1">+0,5 L</Btn>
          </div>
        </div>
        <div>
          <div className="mb-1 text-stone-600">Enerji seviyesi (1 düşük – 5 yüksek)</div>
          <Segmented value={day?.energy} options={scale} onChange={(v) => updDay((d) => void (d.energy = d.energy === v ? undefined : v))} />
        </div>
        <div>
          <div className="mb-1 text-stone-600">Açlık seviyesi (1 tok – 5 çok aç)</div>
          <Segmented value={day?.hunger} options={scale} onChange={(v) => updDay((d) => void (d.hunger = d.hunger === v ? undefined : v))} />
        </div>
        <textarea
          value={day?.note ?? ''}
          onChange={(e) => updDay((d) => void (d.note = e.target.value || undefined))}
          placeholder="Serbest not"
          rows={2}
          className="w-full rounded-lg border border-stone-200 px-2 py-1.5"
        />
      </div>
    </Card>
  )
}

function WeekGlance({ data, date }: { data: AppData; date: ISODate }) {
  const w = weekOf(weekReports(data, date), date)
  if (!w) return null
  return (
    <Card title="Bu hafta" right={<span className="text-xs text-stone-500">Uyum serisi: {complianceStreak(data, today())} gün</span>}>
      <WeightChart data={data} from={addDays(date, -6)} to={date} height={140} />
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Haftalık ort." value={w.avg !== undefined ? `${num(w.avg, 1)} kg` : '—'} sub={`${w.count} gün ölçüm`} />
        <Stat label="Geçen haftaya göre" value={w.diffKg !== undefined ? `${signed(w.diffKg)} kg` : '—'} sub={w.diffPct !== undefined ? `%${signed(w.diffPct, 1)}` : 'karşılaştırma yok'} />
        <Stat label="Antrenman" value={`${w.weights} ağırlık · ${w.runs} koşu`} sub={w.km ? `${num(w.km, 1)} km` : ''} />
        <Stat label="Beslenme uyumu" value={w.judged ? `%${num((w.compliant / w.judged) * 100)}` : '—'} sub={`${w.compliant}/${w.judged} gün`} />
      </dl>
    </Card>
  )
}

export const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div>
    <dt className="text-xs text-stone-500">{label}</dt>
    <dd className="font-semibold tabular-nums">{value}</dd>
    {sub && <dd className="text-xs text-stone-500">{sub}</dd>}
  </div>
)
