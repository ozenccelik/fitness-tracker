import type { AppData, ISODate, Workout } from '../types'
import { addDays, dateRange } from './dates'
import { compliance, dayIntake, targetFor } from './nutrition'
import { measurements, weeklyStats, type WeekStat } from './weight'

/** Minutes per km, or undefined if distance or duration is missing. */
export function pace(w: Pick<Workout, 'distanceKm' | 'durationMin'>): number | undefined {
  if (!w.distanceKm || !w.durationMin) return undefined
  return w.durationMin / w.distanceKm
}

export function fmtPace(minPerKm: number): string {
  const total = Math.round(minPerKm * 60)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} /km`
}

export const workoutsOn = (data: AppData, date: ISODate) => data.workouts.filter((w) => w.date === date)

/** Is the day compliant? null = not judged (incomplete or no meal data). */
export function dayCompliant(data: AppData, date: ISODate): boolean | null {
  const c = compliance(dayIntake(data.days[date], data.foods), targetFor(data, date))
  return c ? c.ok : null
}

/** Consecutive days with `test` true, ending today — or yesterday if today isn't done yet. */
function streak(today: ISODate, test: (d: ISODate) => boolean): number {
  let d = test(today) ? today : addDays(today, -1)
  let n = 0
  while (test(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export const weighInStreak = (data: AppData, today: ISODate) => streak(today, (d) => typeof data.days[d]?.weight === 'number')
export const complianceStreak = (data: AppData, today: ISODate) => streak(today, (d) => dayCompliant(data, d) === true)

export interface WeekReport extends WeekStat {
  weights: number
  runs: number
  km: number
  /** Days judged (complete meal logs) and how many of those were compliant. */
  judged: number
  compliant: number
  current: boolean
}

export function weekReports(data: AppData, today: ISODate): WeekReport[] {
  const until = periodEnd(data) > today ? periodEnd(data) : today
  return weeklyStats(measurements(data.days), data.profile.startDate, until).map((w) => {
    const ws = data.workouts.filter((x) => x.date >= w.start && x.date <= w.end)
    const judgedDays = dateRange(w.start, w.end).map((d) => dayCompliant(data, d)).filter((c) => c !== null)
    return {
      ...w,
      weights: ws.filter((x) => x.kind === 'weights').length,
      runs: ws.filter((x) => x.kind === 'run').length,
      km: ws.reduce((s, x) => s + (x.distanceKm ?? 0), 0),
      judged: judgedDays.length,
      compliant: judgedDays.filter(Boolean).length,
      current: today >= w.start && today <= w.end,
    }
  })
}

export const periodEnd = (data: AppData) => addDays(data.profile.startDate, data.profile.periodWeeks * 7 - 1)

export interface Milestone {
  label: string
  done: boolean
}

const KM_STEPS = [10, 25, 50, 100, 200, 400]
const WORKOUT_STEPS = [5, 10, 25, 50, 100]

export function milestones(data: AppData, today: ISODate): Milestone[] {
  const out: Milestone[] = []
  const avgs = weeklyStats(measurements(data.days), data.profile.startDate, today)
    .map((w) => w.avg)
    .filter((a) => a !== undefined)
  // Baseline: entered start weight, else the first weekly average.
  const base = data.profile.startWeightKg ?? avgs[0]
  if (base !== undefined && avgs.length) {
    const lost = base - Math.min(...avgs)
    const next = Math.max(1, Math.floor(lost) + 1)
    for (let kg = 1; kg <= next; kg++) out.push({ label: `Haftalık ortalamada −${kg} kg`, done: kg <= lost })
  }
  const km = data.workouts.reduce((s, w) => s + (w.distanceKm ?? 0), 0)
  for (const step of KM_STEPS.filter((s, i) => s <= km || i === 0 || KM_STEPS[i - 1] <= km)) {
    out.push({ label: `Toplam ${step} km koşu`, done: km >= step })
  }
  const n = data.workouts.length
  for (const step of WORKOUT_STEPS.filter((s, i) => s <= n || i === 0 || WORKOUT_STEPS[i - 1] <= n)) {
    out.push({ label: `${step} antrenman`, done: n >= step })
  }
  out.push({ label: `${data.profile.periodWeeks} haftalık dönem tamamlandı`, done: today > periodEnd(data) })
  return out
}
