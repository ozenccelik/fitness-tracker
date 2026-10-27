import type { AppData, DayLog, DayType, Food, ISODate, Macros, Meal, MealItem, MealLog, Target } from '../types'
import { weekday } from './dates'

export const ZERO: Macros = { kcal: 0, protein: 0, carb: 0, fat: 0 }

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  rest: 'Dinlenme',
  weights: 'Ağırlık antrenmanı',
  run: 'Koşu',
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (a, b) => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carb: a.carb + b.carb, fat: a.fat + b.fat }),
    ZERO,
  )
}

export function itemGrams(item: MealItem, food: Food | undefined): number {
  if (item.unit === 'g') return item.amount
  return item.amount * (food?.gramsPerUnit ?? 0)
}

export function itemMacros(item: MealItem, foods: Food[]): Macros {
  const food = foods.find((f) => f.id === item.foodId)
  if (!food) return ZERO
  const k = itemGrams(item, food) / 100
  const p = food.per100g
  return { kcal: p.kcal * k, protein: p.protein * k, carb: p.carb * k, fat: p.fat * k }
}

export const mealMacros = (meal: Pick<Meal, 'items'>, foods: Food[]) => sumMacros(meal.items.map((i) => itemMacros(i, foods)))

/** What was actually consumed for one logged meal. Pending and skipped count as nothing. */
export function mealLogMacros(m: MealLog, foods: Food[]): Macros {
  if (m.status === 'pending' || m.status === 'skipped') return ZERO
  const base = mealMacros(m, foods)
  if (m.status === 'eaten') return base
  return { ...base, kcal: m.manualKcal ?? base.kcal, protein: m.manualProtein ?? base.protein }
}

export interface Intake {
  macros: Macros
  /** Every meal of the day is marked eaten, skipped or different. */
  complete: boolean
  done: number
  total: number
}

/** null when nothing has been logged for the day: no data is not the same as zero. */
export function dayIntake(day: DayLog | undefined, foods: Food[]): Intake | null {
  const meals = day?.meals
  if (!meals?.length || meals.every((m) => m.status === 'pending')) return null
  const done = meals.filter((m) => m.status !== 'pending').length
  return {
    macros: sumMacros(meals.map((m) => mealLogMacros(m, foods))),
    complete: done === meals.length,
    done,
    total: meals.length,
  }
}

export function dayTypeFor(data: AppData, date: ISODate): DayType {
  return data.days[date]?.dayType ?? data.plan.find((p) => p.weekday === weekday(date))?.dayType ?? 'rest'
}

export const targetFor = (data: AppData, date: ISODate): Target => data.targets[dayTypeFor(data, date)]

export interface Compliance {
  kcal: 'under' | 'ok' | 'over'
  protein: 'under' | 'ok'
  ok: boolean
}

/** Only judged for complete days; partial or empty days are "veri eksik", never assumed compliant. */
export function compliance(intake: Intake | null, t: Target): Compliance | null {
  if (!intake?.complete) return null
  const { kcal: k, protein: p } = intake.macros
  const kcal = k < t.kcalMin ? 'under' : k > t.kcalMax ? 'over' : 'ok'
  const protein = p < t.proteinMin ? 'under' : 'ok'
  return { kcal, protein, ok: kcal === 'ok' && protein === 'ok' }
}

/** Copy of the plan's meals for a date, used the first time the day is touched. */
export function snapshotMeals(data: AppData, date: ISODate): MealLog[] {
  const plan = data.plan.find((p) => p.weekday === weekday(date))
  return structuredClone(plan?.meals ?? []).map((m) => ({ ...m, status: 'pending' as const }))
}
