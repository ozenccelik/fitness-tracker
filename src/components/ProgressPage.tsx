import { useState } from 'react'
import type { AppData } from '../types'
import { addDays, fmtShort, mondayOf, today } from '../lib/dates'
import { num, signed } from '../lib/format'
import { complianceStreak, milestones, periodEnd, weekReports, weighInStreak } from '../lib/progress'
import { ComplianceChart, Heatmap, IntakeChart, WeeklyAvgChart, WeightChart, WorkoutsChart } from './Charts'
import { Badge, Card, Segmented } from './ui'

type Range = '7' | '30' | 'all'

export function ProgressPage({ data }: { data: AppData }) {
  const [range, setRange] = useState<Range>('30')
  const now = today()
  const allFrom = [data.profile.startDate, ...Object.keys(data.days)].sort()[0]
  const from = range === 'all' ? allFrom : addDays(now, range === '7' ? -6 : -29)
  const reports = weekReports(data, now)
  const pastWeeks = reports.filter((w) => w.start <= now)
  const shownWeeks = pastWeeks.filter((w) => w.end >= from)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card><div className="text-xs text-stone-500">Kilo girişi serisi</div><div className="text-2xl font-semibold">{weighInStreak(data, now)} gün</div></Card>
        <Card><div className="text-xs text-stone-500">Plana uyum serisi</div><div className="text-2xl font-semibold">{complianceStreak(data, now)} gün</div></Card>
      </div>

      <Card title="Antrenman takvimi" right={<span className="text-xs text-stone-500">{fmtShort(data.profile.startDate)} – {fmtShort(periodEnd(data))}</span>}>
        <Heatmap data={data} from={mondayOf(data.profile.startDate)} to={addDays(mondayOf(periodEnd(data)), 6)} />
      </Card>

      <Card title="Kilometre taşları">
        <ul className="flex flex-wrap gap-2">
          {milestones(data, now).map((m) => (
            <li key={m.label} className={`rounded-full px-3 py-1 text-sm ${m.done ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-500'}`}>
              {m.done ? '🏅 ' : '○ '}{m.label}
            </li>
          ))}
        </ul>
      </Card>

      <div className="sticky top-0 z-10 -mx-4 bg-stone-50/95 px-4 py-2 backdrop-blur">
        <Segmented value={range} onChange={setRange} options={[{ value: '7', label: '7 gün' }, { value: '30', label: '30 gün' }, { value: 'all', label: 'Tüm dönem' }]} />
      </div>

      <Card title="Günlük kilo ve haftalık ortalama"><WeightChart data={data} from={from} to={now} /></Card>
      <Card title="Haftalık ortalama kilo"><WeeklyAvgChart weeks={shownWeeks} /></Card>
      <Card title="Kalori (kcal): alınan ve hedef"><IntakeChart data={data} from={from} to={now} metric="kcal" /></Card>
      <Card title="Protein (g): alınan ve hedef alt sınırı"><IntakeChart data={data} from={from} to={now} metric="protein" /></Card>
      <Card title="Haftalık antrenman sayısı"><WorkoutsChart weeks={shownWeeks} /></Card>
      <Card title="Haftalık beslenme uyumu"><ComplianceChart weeks={shownWeeks} /></Card>

      <h2 className="pt-2 text-sm font-semibold text-stone-700">Haftalık karneler</h2>
      {[...pastWeeks].reverse().map((w) => (
        <Card
          key={w.start}
          title={`${fmtShort(w.start)} – ${fmtShort(w.end)}`}
          right={<span className="flex gap-1">{w.current && <Badge tone="sky">devam ediyor</Badge>}{w.partial && <Badge tone="amber">kısmi hafta</Badge>}</span>}
        >
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-stone-500">Ortalama kilo</dt><dd className="font-semibold">{w.avg !== undefined ? `${num(w.avg, 1)} kg` : '—'}</dd><dd className="text-xs text-stone-500">{w.count} gün ölçüm</dd></div>
            <div>
              <dt className="text-xs text-stone-500">Önceki haftaya göre</dt>
              <dd className="font-semibold">{w.diffKg !== undefined ? `${signed(w.diffKg)} kg` : '—'}</dd>
              <dd className="text-xs text-stone-500">{w.diffPct !== undefined ? `%${signed(w.diffPct, 2)}` : 'karşılaştırma yok'}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Antrenman</dt>
              <dd className="font-semibold">{w.weights} ağırlık · {w.runs} koşu</dd>
              <dd className="text-xs text-stone-500">{w.km ? `${num(w.km, 1)} km` : 'koşu yok'}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Beslenme uyumu</dt>
              <dd className="font-semibold">{w.judged ? `%${num((w.compliant / w.judged) * 100)}` : '—'}</dd>
              <dd className="text-xs text-stone-500">{w.compliant}/{w.judged} değerlendirilen gün</dd>
            </div>
          </dl>
        </Card>
      ))}
    </div>
  )
}
