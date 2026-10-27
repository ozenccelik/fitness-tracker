import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AppData, ISODate } from '../types'
import { dateRange, fmtShort, today, weekday } from '../lib/dates'
import { num } from '../lib/format'
import { dayIntake, targetFor } from '../lib/nutrition'
import { measurements, weeklyStats, type WeekStat } from '../lib/weight'
import type { WeekReport } from '../lib/progress'

// Categorical slots 1–2 of the dataviz reference palette; gray for target lines.
const C1 = '#2a78d6'
const C2 = '#eb6834'
const MUTED = '#8f8d87'
const axis = { tick: { fontSize: 11, fill: '#52514e' }, tickLine: false, axisLine: { stroke: '#d6d4cf' } }
const grid = <CartesianGrid stroke="#ecebe7" vertical={false} />
const fmt = (digits: number, unit: string) => (v: unknown) => (typeof v === 'number' ? `${num(v, digits)} ${unit}` : '—')

export function WeightChart({ data, from, to, height = 260 }: { data: AppData; from: ISODate; to: ISODate; height?: number }) {
  const pts = measurements(data.days)
  const weeks = weeklyStats(pts, data.profile.startDate, to)
  const rows = dateRange(from, to).map((d) => ({
    label: fmtShort(d),
    weight: pts.find((p) => p.date === d)?.weight ?? null,
    avg: weeks.find((w) => d >= w.start && d <= w.end)?.avg ?? null,
  }))
  if (!rows.some((r) => r.weight !== null)) return <Empty height={height}>Bu aralıkta kilo kaydı yok.</Empty>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        {grid}
        <XAxis dataKey="label" {...axis} minTickGap={16} />
        <YAxis {...axis} domain={['dataMin - 0.5', 'dataMax + 0.5']} tickFormatter={(v) => num(v, 1)} unit=" kg" width={64} />
        <Tooltip formatter={fmt(1, 'kg')} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line name="Haftalık ortalama" dataKey="avg" stroke={C2} strokeWidth={2} dot={false} type="stepAfter" connectNulls={false} isAnimationActive={false} />
        <Line name="Günlük ölçüm" dataKey="weight" stroke={C1} strokeWidth={2} dot={{ r: 4, fill: C1 }} connectNulls={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function WeeklyAvgChart({ weeks }: { weeks: WeekStat[] }) {
  const rows = weeks.map((w) => ({ label: fmtShort(w.start), avg: w.avg ?? null }))
  if (!rows.some((r) => r.avg !== null)) return <Empty>Henüz haftalık ortalama yok.</Empty>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        {grid}
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} domain={['dataMin - 0.5', 'dataMax + 0.5']} tickFormatter={(v) => num(v, 1)} unit=" kg" width={64} />
        <Tooltip formatter={fmt(1, 'kg')} labelFormatter={(l) => `${l} haftası`} />
        <Line name="Haftalık ortalama" dataKey="avg" stroke={C2} strokeWidth={2} dot={{ r: 4, fill: C2 }} connectNulls={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Only complete days get a bar: a half-logged day is not a low-calorie day. */
export function IntakeChart({ data, from, to, metric }: { data: AppData; from: ISODate; to: ISODate; metric: 'kcal' | 'protein' }) {
  const rows = dateRange(from, to).map((d) => {
    const intake = dayIntake(data.days[d], data.foods)
    const t = targetFor(data, d)
    return {
      label: fmtShort(d),
      value: intake?.complete ? intake.macros[metric] : null,
      min: metric === 'kcal' ? t.kcalMin : t.proteinMin,
      max: metric === 'kcal' ? t.kcalMax : t.proteinMax,
    }
  })
  const unit = metric === 'kcal' ? 'kcal' : 'g'
  if (!rows.some((r) => r.value !== null)) return <Empty>Bu aralıkta tamamlanmış gün yok.</Empty>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        {grid}
        <XAxis dataKey="label" {...axis} minTickGap={16} />
        <YAxis {...axis} tickFormatter={(v) => num(v)} width={56} />
        <Tooltip formatter={fmt(0, unit)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar name={metric === 'kcal' ? 'Alınan kalori' : 'Alınan protein'} dataKey="value" fill={C1} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        <Line name="Hedef alt sınır" dataKey="min" stroke={MUTED} strokeDasharray="4 3" dot={false} type="stepAfter" isAnimationActive={false} />
        {metric === 'kcal' && <Line name="Hedef üst sınır" dataKey="max" stroke={MUTED} dot={false} type="stepAfter" isAnimationActive={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function WorkoutsChart({ weeks }: { weeks: WeekReport[] }) {
  const rows = weeks.map((w) => ({ label: fmtShort(w.start), weights: w.weights, runs: w.runs }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        {grid}
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip labelFormatter={(l) => `${l} haftası`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar name="Ağırlık" dataKey="weights" stackId="a" fill={C1} stroke="#fff" strokeWidth={2} isAnimationActive={false} />
        <Bar name="Koşu" dataKey="runs" stackId="a" fill={C2} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ComplianceChart({ weeks }: { weeks: WeekReport[] }) {
  const rows = weeks.map((w) => ({ label: fmtShort(w.start), pct: w.judged ? (w.compliant / w.judged) * 100 : null, n: `${w.compliant}/${w.judged}` }))
  if (!rows.some((r) => r.pct !== null)) return <Empty>Henüz değerlendirilen gün yok.</Empty>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        {grid}
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} domain={[0, 100]} unit="%" />
        <Tooltip formatter={(v, _n, p) => (typeof v === 'number' ? `%${num(v)} (${p.payload.n} gün)` : '—')} labelFormatter={(l) => `${l} haftası`} />
        <Bar name="Uyumlu günler" dataKey="pct" fill={C1} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** GitHub-style calendar: one column per week, Monday on top. */
export function Heatmap({ data, from, to }: { data: AppData; from: ISODate; to: ISODate }) {
  const days = dateRange(from, to)
  const now = today()
  const kind = (d: ISODate) => {
    const ws = data.workouts.filter((w) => w.date === d)
    const run = ws.some((w) => w.kind === 'run')
    const lift = ws.some((w) => w.kind === 'weights')
    return run && lift ? 'both' : run ? 'run' : lift ? 'weights' : 'none'
  }
  const color = { none: 'bg-stone-100', weights: 'bg-[#2a78d6]', run: 'bg-[#eb6834]', both: 'bg-[#4a3aa7]' }
  const label = { none: 'antrenman yok', weights: 'ağırlık', run: 'koşu', both: 'ağırlık + koşu' }
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <div className="grid grid-rows-7 gap-1 pr-1 text-[10px] leading-4 text-stone-400">
          {['Pt', '', 'Ça', '', 'Cu', '', 'Pz'].map((l, i) => <span key={i}>{l}</span>)}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {Array.from({ length: weekday(from) }, (_, i) => <span key={`pad${i}`} />)}
          {days.map((d) => {
            const k = kind(d)
            return (
              <span
                key={d}
                title={`${fmtShort(d)}: ${label[k]}`}
                className={`size-4 rounded-sm ${color[k]} ${d > now ? 'opacity-40' : ''} ${d === now ? 'ring-2 ring-stone-800 ring-offset-1' : ''}`}
              />
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-600">
        {(['weights', 'run', 'both', 'none'] as const).map((k) => (
          <span key={k} className="flex items-center gap-1"><span className={`size-3 rounded-sm ${color[k]}`} />{label[k]}</span>
        ))}
      </div>
    </div>
  )
}

const Empty = ({ children, height = 160 }: { children: string; height?: number }) => (
  <div className="flex items-center justify-center rounded-xl bg-stone-50 text-sm text-stone-500" style={{ height }}>{children}</div>
)
