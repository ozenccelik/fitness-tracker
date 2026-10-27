import type { DayLog, ISODate } from '../types'
import { addDays, daysBetween, mondayOf } from './dates'

export interface WeightPoint {
  date: ISODate
  weight: number
}

/** Real measurements only, sorted by date. Missing days are simply absent. */
export function measurements(days: Record<ISODate, DayLog>): WeightPoint[] {
  return Object.values(days)
    .filter((d): d is DayLog & { weight: number } => typeof d.weight === 'number' && Number.isFinite(d.weight))
    .map((d) => ({ date: d.date, weight: d.weight }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Difference to the latest earlier measurement, and how many days back that was. */
export function previousDiff(points: WeightPoint[], date: ISODate): { diff: number; gapDays: number; prev: WeightPoint } | null {
  const cur = points.find((p) => p.date === date)
  const prev = points.filter((p) => p.date < date).at(-1)
  if (!cur || !prev) return null
  return { diff: cur.weight - prev.weight, gapDays: daysBetween(prev.date, date), prev }
}

export interface WeekStat {
  start: ISODate
  end: ISODate
  /** Starts before the tracking start date (first week). */
  partial: boolean
  count: number
  avg?: number
  diffKg?: number
  diffPct?: number
}

/**
 * Monday–Sunday weeks from the week containing `startDate` through the week containing `until`.
 * Average uses entered measurements only; a week without any has no average, and the
 * next week then has no diff (previous week only, never a guess).
 */
export function weeklyStats(points: WeightPoint[], startDate: ISODate, until: ISODate): WeekStat[] {
  const weeks: WeekStat[] = []
  for (let start = mondayOf(startDate); start <= until; start = addDays(start, 7)) {
    const end = addDays(start, 6)
    const inWeek = points.filter((p) => p.date >= start && p.date <= end && p.date >= startDate)
    const avg = inWeek.length ? inWeek.reduce((s, p) => s + p.weight, 0) / inWeek.length : undefined
    const prevAvg = weeks.at(-1)?.avg
    const w: WeekStat = { start, end, partial: start < startDate, count: inWeek.length, avg }
    if (avg !== undefined && prevAvg !== undefined) {
      w.diffKg = avg - prevAvg
      w.diffPct = (w.diffKg / prevAvg) * 100
    }
    weeks.push(w)
  }
  return weeks
}

export const weekOf = <W extends WeekStat>(weeks: W[], date: ISODate) => weeks.find((w) => date >= w.start && date <= w.end)
