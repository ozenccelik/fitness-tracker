import type { ISODate } from '../types'

// All date math goes through UTC on 'YYYY-MM-DD' strings, so no timezone
// (Europe/Istanbul or otherwise) can shift a day.

const toUTC = (d: ISODate) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}
const fromUTC = (dt: Date): ISODate => dt.toISOString().slice(0, 10)

/** Today's local calendar date. */
export function today(now = new Date()): ISODate {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

export function addDays(d: ISODate, n: number): ISODate {
  const dt = toUTC(d)
  dt.setUTCDate(dt.getUTCDate() + n)
  return fromUTC(dt)
}

/** 0 = Pazartesi … 6 = Pazar */
export const weekday = (d: ISODate) => (toUTC(d).getUTCDay() + 6) % 7

export const mondayOf = (d: ISODate) => addDays(d, -weekday(d))

export const daysBetween = (a: ISODate, b: ISODate) =>
  Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000)

/** Inclusive range of dates. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

const fmt = (opts: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat('tr-TR', { ...opts, timeZone: 'UTC' })
  return (d: ISODate) => f.format(toUTC(d))
}
export const fmtLong = fmt({ day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
export const fmtShort = fmt({ day: 'numeric', month: 'short' })
export const fmtDayMonth = fmt({ day: '2-digit', month: '2-digit' })

export const WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
