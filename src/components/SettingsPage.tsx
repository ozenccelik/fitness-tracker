import type { ReactNode } from 'react'
import type { AppData, DayType, Food, Macros, Profile, Target } from '../types'
import { fmtLong, today } from '../lib/dates'
import { uid } from '../lib/format'
import { dailyCsv, download, parseBackup, toJson, weightCsv } from '../lib/io'
import { DAY_TYPE_LABEL } from '../lib/nutrition'
import { periodEnd } from '../lib/progress'
import { Badge, Btn, Card, NumField } from './ui'

type Update = (fn: (d: AppData) => void) => void

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex items-center justify-between gap-3 text-sm">
    <span className="text-stone-600">{label}</span>
    <span className="flex items-center gap-1">{children}</span>
  </label>
)

export function SettingsPage({ data, update, replace, reset }: { data: AppData; update: Update; replace: (d: AppData) => void; reset: () => void }) {
  const setP = <K extends keyof Profile>(k: K, v: Profile[K]) => update((d) => void (d.profile[k] = v))
  const setT = (t: DayType, k: keyof Target, v: number | undefined) => v !== undefined && update((d) => void (d.targets[t][k] = v))
  const setF = (id: string, fn: (f: Food) => void) => update((d) => fn(d.foods.find((f) => f.id === id)!))
  const stamp = today()

  const importFile = async (file: File) => {
    try {
      const next = parseBackup(await file.text())
      if (confirm('Yedek geri yüklensin mi? Mevcut tüm veriler bu yedekle değiştirilecek.')) replace(next)
    } catch (e) {
      alert(`Yedek okunamadı: ${(e as Error).message}`)
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Profil">
        <div className="space-y-2">
          <Row label="Yaş"><NumField value={data.profile.age} onCommit={(v) => setP('age', v)} className="w-20" /></Row>
          <Row label="Boy"><NumField value={data.profile.heightCm} onCommit={(v) => setP('heightCm', v)} className="w-20" /> cm</Row>
          <Row label="Başlangıç kilosu"><NumField value={data.profile.startWeightKg} digits={1} onCommit={(v) => setP('startWeightKg', v)} className="w-20" /> kg</Row>
          <Row label="Takip başlangıcı">
            <input type="date" value={data.profile.startDate} onChange={(e) => e.target.value && setP('startDate', e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1" />
          </Row>
          <Row label="Takip dönemi">
            <NumField value={data.profile.periodWeeks} onCommit={(v) => v && v > 0 && setP('periodWeeks', Math.round(v))} className="w-16" /> hafta
            <Btn onClick={() => setP('periodWeeks', data.profile.periodWeeks + 4)}>+4</Btn>
          </Row>
          <p className="text-xs text-stone-500">Dönem sonu: {fmtLong(periodEnd(data))}. Dönem bitse de kayıt girmeye devam edebilirsin.</p>
          <Row label="Günlük su hedefi"><NumField value={data.profile.waterTargetL} digits={1} onCommit={(v) => v && setP('waterTargetL', v)} className="w-16" /> L</Row>
          <Row label="Haftalık ağırlık antrenmanı hedefi"><NumField value={data.profile.weeklyWeightsTarget} onCommit={(v) => v !== undefined && setP('weeklyWeightsTarget', v)} className="w-16" /></Row>
          <Row label="Haftalık koşu hedefi"><NumField value={data.profile.weeklyRunTarget} onCommit={(v) => v !== undefined && setP('weeklyRunTarget', v)} className="w-16" /></Row>
        </div>
      </Card>

      <Card title="Günlük hedefler">
        <div className="space-y-3">
          {(['rest', 'weights', 'run'] as const).map((t) => (
            <div key={t} className="text-sm">
              <div className="mb-1 font-medium">{DAY_TYPE_LABEL[t]}</div>
              <div className="flex flex-wrap items-center gap-1">
                <NumField value={data.targets[t].kcalMin} onCommit={(v) => setT(t, 'kcalMin', v)} className="w-20" aria-label="Kalori alt" />–
                <NumField value={data.targets[t].kcalMax} onCommit={(v) => setT(t, 'kcalMax', v)} className="w-20" aria-label="Kalori üst" /> kcal
                <span className="mx-2 text-stone-300">|</span>
                <NumField value={data.targets[t].proteinMin} onCommit={(v) => setT(t, 'proteinMin', v)} className="w-16" aria-label="Protein alt" />–
                <NumField value={data.targets[t].proteinMax} onCommit={(v) => setT(t, 'proteinMax', v)} className="w-16" aria-label="Protein üst" /> g protein
              </div>
            </div>
          ))}
          <p className="text-xs text-stone-500">Bunlar başlangıç hedefleridir, doğrulanmış değerler değildir. Bu uygulama tıbbi teşhis ya da diyetisyen hizmeti sunmaz.</p>
        </div>
      </Card>

      <Card title="Besinler (100 g başına)" right={<Badge tone="amber">tahmini değerler</Badge>}>
        <p className="mb-3 text-xs text-stone-500">Kaynak: USDA FoodData Central ortalamaları ve market etiketi ortalamaları. Markaya göre değişebilir; paket etiketindeki değerle düzelt.</p>
        <div className="space-y-3">
          {data.foods.map((f) => (
            <div key={f.id} className="border-b border-stone-100 pb-3 text-sm last:border-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <input value={f.name} onChange={(e) => setF(f.id, (x) => void (x.name = e.target.value))} className="min-w-0 flex-1 rounded border border-stone-200 px-2 py-1 font-medium" aria-label="Besin adı" />
                <select value={f.state ?? ''} onChange={(e) => setF(f.id, (x) => void (x.state = (e.target.value || undefined) as Food['state']))} className="rounded border border-stone-200 px-1 py-1" aria-label="Tartım durumu">
                  <option value="">tartım: —</option><option value="çiğ">çiğ</option><option value="pişmiş">pişmiş</option><option value="kuru">kuru</option>
                </select>
                {f.estimated ? <Badge tone="amber">tahmini</Badge> : <Badge tone="emerald">etiketten</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-1 text-xs text-stone-600">
                {(['kcal', 'protein', 'carb', 'fat'] as (keyof Macros)[]).map((k) => (
                  <span key={k} className="flex items-center gap-1">
                    <NumField value={f.per100g[k]} digits={1} onCommit={(v) => v !== undefined && setF(f.id, (x) => { x.per100g[k] = v; x.estimated = false; x.source = 'Kullanıcı tarafından girildi' })} className="w-16 text-sm" aria-label={k} />
                    {{ kcal: 'kcal', protein: 'P', carb: 'K', fat: 'Y' }[k]}
                  </span>
                ))}
                {f.gramsPerUnit !== undefined && (
                  <span className="flex items-center gap-1">· 1 adet = <NumField value={f.gramsPerUnit} onCommit={(v) => v && setF(f.id, (x) => void (x.gramsPerUnit = v))} className="w-14 text-sm" /> g</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <Btn className="mt-3" onClick={() => {
          const name = prompt('Besin adı')
          if (name) update((d) => void d.foods.push({ id: uid(), name, per100g: { kcal: 0, protein: 0, carb: 0, fat: 0 }, source: 'Kullanıcı tarafından girildi', estimated: false }))
        }}>+ Besin ekle</Btn>
      </Card>

      <Card title="Veri">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => download(`kilo-${stamp}.csv`, weightCsv(data), 'text/csv;charset=utf-8')}>Kilo geçmişi (CSV)</Btn>
            <Btn onClick={() => download(`gunluk-${stamp}.csv`, dailyCsv(data), 'text/csv;charset=utf-8')}>Günlük kayıtlar (CSV)</Btn>
            <Btn onClick={() => download(`yedek-${stamp}.json`, toJson(data), 'application/json')}>Tüm veriler (JSON yedek)</Btn>
          </div>
          <label className="block text-sm">
            <span className="text-stone-600">JSON yedeği geri yükle: </span>
            <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} className="text-sm" />
          </label>
          <p className="text-xs text-stone-500">Veriler yalnızca bu tarayıcıda saklanır. Düzenli olarak JSON yedeği al. CSV dosyaları Google Sheets'e doğrudan aktarılabilir.</p>
          <Btn tone="danger" onClick={() => {
            if (prompt('Tüm veriler silinecek ve plan başlangıç haline dönecek. Onaylamak için SİL yaz.') === 'SİL') reset()
          }}>Tüm verileri sil</Btn>
        </div>
      </Card>
    </div>
  )
}
