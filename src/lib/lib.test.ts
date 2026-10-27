// All weights here are made-up test values.
import { describe, expect, it } from 'vitest'
import { seedData } from '../data/seed'
import type { AppData, DayLog, MealLog } from '../types'
import { addDays, mondayOf, today, weekday } from './dates'
import { parseBackup, toJson, weightCsv } from './io'
import { compliance, dayIntake, itemMacros, mealMacros } from './nutrition'
import { complianceStreak, pace, weighInStreak } from './progress'
import { measurements, previousDiff, weeklyStats } from './weight'

const days = (entries: [string, number][]): Record<string, DayLog> =>
  Object.fromEntries(entries.map(([date, weight]) => [date, { date, weight }]))

describe('dates', () => {
  it('does not shift across month/DST boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2027-03-28', 1)).toBe('2027-03-29')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('weeks start on Monday', () => {
    expect(weekday('2026-10-27')).toBe(1) // Salı
    expect(mondayOf('2026-10-27')).toBe('2026-10-26')
    expect(mondayOf('2026-11-01')).toBe('2026-10-26') // Pazar
  })
  it('today uses local calendar date', () => {
    expect(today(new Date(2026, 9, 27, 23, 59))).toBe('2026-10-27')
  })
})

describe('weekly weight average', () => {
  const pts = measurements(days([
    ['2026-10-27', 80.0], ['2026-10-28', 79.6], ['2026-10-29', 79.8], // week 1 (partial)
    // week 2 has no measurements at all
    ['2026-11-09', 79.0], ['2026-11-11', 78.6], // week 3, only two days
    ['2026-11-16', 78.4],
  ]))
  const weeks = weeklyStats(pts, '2026-10-27', '2026-11-22')

  it('averages only entered measurements', () => {
    expect(weeks[0].avg).toBeCloseTo(79.8, 5)
    expect(weeks[0].count).toBe(3)
    expect(weeks[2].avg).toBeCloseTo(78.8, 5) // not divided by 7, no zeros, no carry-forward
    expect(weeks[2].count).toBe(2)
  })
  it('marks the first week as partial', () => {
    expect(weeks[0]).toMatchObject({ start: '2026-10-26', end: '2026-11-01', partial: true })
    expect(weeks[1].partial).toBe(false)
  })
  it('leaves empty weeks and their neighbours without a guessed value', () => {
    expect(weeks[1].avg).toBeUndefined()
    expect(weeks[1].diffKg).toBeUndefined()
    expect(weeks[2].diffKg).toBeUndefined() // previous week empty → no diff
  })
  it('computes kg and % change vs previous week', () => {
    expect(weeks[3].diffKg).toBeCloseTo(-0.4, 5)
    expect(weeks[3].diffPct).toBeCloseTo((-0.4 / 78.8) * 100, 5)
  })
  it('ignores days without weight', () => {
    expect(measurements({ '2026-10-30': { date: '2026-10-30', note: 'x' } })).toEqual([])
  })
  it('diffs against the latest earlier measurement', () => {
    expect(previousDiff(pts, '2026-11-09')).toMatchObject({ gapDays: 11 })
    expect(previousDiff(pts, '2026-11-09')!.diff).toBeCloseTo(-0.8, 5)
    expect(previousDiff(pts, '2026-10-27')).toBeNull()
  })
})

describe('nutrition', () => {
  const data = seedData()
  const chicken = { id: 'x', foodId: 'tavuk', amount: 250, unit: 'g' as const }

  it('scales macros with amount', () => {
    expect(itemMacros(chicken, data.foods).kcal).toBeCloseTo(300, 5)
    expect(itemMacros({ ...chicken, amount: 200 }, data.foods).protein).toBeCloseTo(45, 5)
  })
  it('converts pieces with gramsPerUnit', () => {
    expect(itemMacros({ id: 'e', foodId: 'yumurta', amount: 2, unit: 'adet' }, data.foods).kcal).toBeCloseTo(143, 5)
  })
  it('sums a meal', () => {
    const m = mealMacros({ items: [chicken, { id: 'z', foodId: 'zeytinyagi', amount: 10, unit: 'g' }] }, data.foods)
    expect(m.kcal).toBeCloseTo(388.4, 5)
    expect(m.fat).toBeCloseTo(16.5, 5)
  })

  const log = (status: MealLog['status'], extra: Partial<MealLog> = {}): MealLog =>
    ({ id: status, name: '', time: '', items: [chicken], status, ...extra })
  const target = { kcalMin: 1800, kcalMax: 1900, proteinMin: 160, proteinMax: 180 }

  it('has no intake when nothing is logged', () => {
    expect(dayIntake(undefined, data.foods)).toBeNull()
    expect(dayIntake({ date: 'd', meals: [log('pending')] }, data.foods)).toBeNull()
  })
  it('does not judge an incomplete day', () => {
    const intake = dayIntake({ date: 'd', meals: [log('eaten'), log('pending')] }, data.foods)
    expect(intake).toMatchObject({ complete: false, done: 1, total: 2 })
    expect(compliance(intake, target)).toBeNull()
  })
  it('manual kcal/protein override the computed values', () => {
    const intake = dayIntake({ date: 'd', meals: [log('different', { manualKcal: 1850, manualProtein: 170 }), log('skipped')] }, data.foods)
    expect(intake!.macros.kcal).toBe(1850)
    expect(compliance(intake, target)).toEqual({ kcal: 'ok', protein: 'ok', ok: true })
  })
  it('reports under / over target honestly', () => {
    const under = dayIntake({ date: 'd', meals: [log('eaten')] }, data.foods)
    expect(compliance(under, target)).toEqual({ kcal: 'under', protein: 'under', ok: false })
    const over = dayIntake({ date: 'd', meals: [log('different', { manualKcal: 2400, manualProtein: 200 })] }, data.foods)
    expect(compliance(over, target)).toMatchObject({ kcal: 'over', protein: 'ok', ok: false })
  })
  it('seed plan totals land near the stated targets (sanity check, not a guarantee)', () => {
    for (const day of data.plan) {
      const kcal = day.meals.reduce((s, m) => s + mealMacros(m, data.foods).kcal, 0)
      expect(kcal).toBeGreaterThan(1500)
      expect(kcal).toBeLessThan(2600)
    }
  })
})

describe('progress', () => {
  it('pace needs both distance and duration', () => {
    expect(pace({ distanceKm: 10, durationMin: 75 })).toBe(7.5)
    expect(pace({ distanceKm: 10 })).toBeUndefined()
    expect(pace({ durationMin: 75 })).toBeUndefined()
  })
  it('streaks count back from today or yesterday', () => {
    const data: AppData = { ...seedData(), days: days([['2026-11-01', 80], ['2026-11-02', 80], ['2026-11-03', 80]]) }
    expect(weighInStreak(data, '2026-11-03')).toBe(3)
    expect(weighInStreak(data, '2026-11-04')).toBe(3) // today not entered yet
    expect(weighInStreak(data, '2026-11-05')).toBe(0)
    expect(complianceStreak(data, '2026-11-03')).toBe(0)
  })
})

describe('io', () => {
  it('round-trips a JSON backup', () => {
    const data = { ...seedData(), days: days([['2026-10-27', 80]]) }
    expect(parseBackup(toJson(data))).toEqual(data)
  })
  it('rejects a non-backup file', () => {
    expect(() => parseBackup('{"foo":1}')).toThrow()
  })
  it('writes a BOM-prefixed CSV with Turkish headers', () => {
    const csv = weightCsv({ ...seedData(), days: days([['2026-10-27', 80.25], ['2026-10-28', 80]]) })
    expect(csv.startsWith('﻿Tarih,Kilo (kg),Önceki ölçüme göre fark (kg),Not\n')).toBe(true)
    expect(csv).toContain('2026-10-27,80.25,,\n2026-10-28,80,-0.25,\n')
  })
})
