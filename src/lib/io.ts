import type { AppData, ISODate } from '../types'
import { dateRange } from './dates'
import { DAY_TYPE_LABEL, compliance, dayIntake, dayTypeFor, targetFor } from './nutrition'
import { pace } from './progress'
import { measurements, previousDiff } from './weight'

// CSV for Google Sheets: UTF-8 with BOM (keeps Turkish characters), comma separator,
// ISO dates and dot decimals so no locale guesses wrong.
const cell = (v: unknown) => {
  if (v === undefined || v === null) return ''
  const s = typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export const toCsv = (rows: unknown[][]) => '﻿' + rows.map((r) => r.map(cell).join(',')).join('\n') + '\n'

export function weightCsv(data: AppData): string {
  const pts = measurements(data.days)
  return toCsv([
    ['Tarih', 'Kilo (kg)', 'Önceki ölçüme göre fark (kg)', 'Not'],
    ...pts.map((p) => [p.date, p.weight, previousDiff(pts, p.date)?.diff, data.days[p.date]?.weightNote]),
  ])
}

const STATUS = { under: 'altında', ok: 'uyumlu', over: 'üstünde' }

export function dailyCsv(data: AppData): string {
  const dates = [...Object.keys(data.days), ...data.workouts.map((w) => w.date)].sort()
  if (!dates.length) return toCsv([['Tarih']])
  const rows = dateRange(dates[0], dates.at(-1)!).map((d: ISODate) => {
    const day = data.days[d]
    const intake = dayIntake(day, data.foods)
    const c = compliance(intake, targetFor(data, d))
    const ws = data.workouts.filter((w) => w.date === d)
    const runs = ws.filter((w) => w.kind === 'run')
    const km = runs.reduce((s, w) => s + (w.distanceKm ?? 0), 0)
    const p = runs.length === 1 ? pace(runs[0]) : undefined
    return [
      d, day?.weight, DAY_TYPE_LABEL[dayTypeFor(data, d)],
      intake ? `${intake.done}/${intake.total}` : '', intake?.macros.kcal, intake?.macros.protein,
      c ? STATUS[c.kcal] : '', c ? STATUS[c.protein] : '',
      ws.some((w) => w.kind === 'weights') ? 'evet' : 'hayır', runs.length ? 'evet' : 'hayır', km || '', p,
      day?.waterL, day?.energy, day?.hunger, day?.note,
    ]
  })
  return toCsv([
    ['Tarih', 'Kilo (kg)', 'Gün türü', 'İşaretli öğün', 'Kalori (kcal)', 'Protein (g)', 'Kalori uyumu', 'Protein uyumu',
      'Ağırlık antrenmanı', 'Koşu', 'Mesafe (km)', 'Tempo (dk/km)', 'Su (L)', 'Enerji (1-5)', 'Açlık (1-5)', 'Not'],
    ...rows,
  ])
}

export const toJson = (data: AppData) => JSON.stringify(data, null, 2)

/** Validates a backup's shape before it is allowed to replace current data. */
export function parseBackup(text: string): AppData {
  const d = JSON.parse(text)
  const ok = d && d.version === 1 && d.profile && d.targets && Array.isArray(d.foods) && Array.isArray(d.plan)
    && Array.isArray(d.recipes) && typeof d.days === 'object' && Array.isArray(d.workouts)
  if (!ok) throw new Error('Bu dosya geçerli bir yedek değil.')
  return d as AppData
}

export function download(name: string, content: string, type: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
