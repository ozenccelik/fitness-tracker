// Dates are always local calendar days as 'YYYY-MM-DD' strings (see lib/dates.ts).
export type ISODate = string

export type DayType = 'rest' | 'weights' | 'run'
export type WeighState = 'çiğ' | 'pişmiş' | 'kuru'

export interface Macros {
  kcal: number
  protein: number
  carb: number
  fat: number
}

export interface Food {
  id: string
  name: string
  per100g: Macros
  state?: WeighState
  /** Grams per piece, for foods counted in 'adet' (egg, banana). */
  gramsPerUnit?: number
  source: string
  estimated: boolean
}

export interface MealItem {
  id: string
  foodId: string
  amount: number
  unit: 'g' | 'adet'
  /** Shown as a "varsayım" badge, e.g. when the source menu had no quantity. */
  assumption?: string
}

export interface Meal {
  id: string
  name: string
  time: string
  items: MealItem[]
}

export interface PlanDay {
  /** 0 = Pazartesi … 6 = Pazar */
  weekday: number
  dayType: DayType
  note?: string
  meals: Meal[]
}

export interface Recipe {
  id: string
  name: string
  items: MealItem[]
}

export type MealStatus = 'pending' | 'eaten' | 'skipped' | 'different'

/** A meal as it was on that day: a copy of the plan, never a reference to it. */
export interface MealLog extends Meal {
  status: MealStatus
  /** Only used when status is 'different'; overrides the item-based total. */
  manualKcal?: number
  manualProtein?: number
}

export interface DayLog {
  date: ISODate
  weight?: number
  weightNote?: string
  dayType?: DayType
  /** Snapshot of the day's meals, created on first interaction. */
  meals?: MealLog[]
  waterL?: number
  energy?: number
  hunger?: number
  note?: string
}

export interface ExerciseSet {
  reps: number
  weightKg?: number
}

export interface Exercise {
  name: string
  sets: ExerciseSet[]
}

export interface Workout {
  id: string
  date: ISODate
  kind: 'weights' | 'run'
  label?: string
  note?: string
  distanceKm?: number
  durationMin?: number
  fasted?: boolean
  /** Reserved for a later exercise/set UI. */
  exercises?: Exercise[]
}

export interface Target {
  kcalMin: number
  kcalMax: number
  proteinMin: number
  proteinMax: number
}

export interface Profile {
  age?: number
  heightCm?: number
  startWeightKg?: number
  startDate: ISODate
  periodWeeks: number
  waterTargetL: number
  weeklyWeightsTarget: number
  weeklyRunTarget: number
}

export interface AppData {
  version: 1
  profile: Profile
  targets: Record<DayType, Target>
  foods: Food[]
  plan: PlanDay[]
  recipes: Recipe[]
  days: Record<ISODate, DayLog>
  workouts: Workout[]
}
