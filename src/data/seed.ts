import type { AppData, Food, Meal, MealItem, PlanDay } from '../types'

const USDA = 'USDA FoodData Central ortalaması (tahmini)'
const LABEL = 'Türkiye market etiketi ortalaması (tahmini, markaya göre değişir)'

const f = (id: string, name: string, kcal: number, protein: number, carb: number, fat: number, extra: Partial<Food> = {}): Food => ({
  id, name, per100g: { kcal, protein, carb, fat }, source: USDA, estimated: true, ...extra,
})

// Per 100 g. Estimates, not verified values: every one is editable in Ayarlar.
export const FOODS: Food[] = [
  f('yumurta', 'Yumurta', 143, 12.6, 0.7, 9.5, { state: 'çiğ', gramsPerUnit: 50 }),
  f('lor', 'Lor peyniri', 98, 12, 3.5, 4, { source: LABEL }),
  f('ekmek', 'Tam buğday ekmeği', 247, 13, 41, 3.4, { source: LABEL }),
  f('domates', 'Domates', 18, 0.9, 3.9, 0.2, { state: 'çiğ' }),
  f('salatalik', 'Salatalık', 15, 0.7, 3.6, 0.1, { state: 'çiğ' }),
  f('whey', 'Whey protein', 400, 78, 8, 6, { source: LABEL }),
  f('yulaf', 'Yulaf', 379, 13.2, 67.7, 6.5, { state: 'kuru' }),
  f('yogurt', 'Yoğurt (tam yağlı, sade)', 61, 3.5, 4.7, 3.3),
  f('muz', 'Muz', 89, 1.1, 22.8, 0.3, { state: 'çiğ', gramsPerUnit: 120 }),
  f('elma', 'Elma', 52, 0.3, 13.8, 0.2, { state: 'çiğ' }),
  f('fistik', 'Fıstık ezmesi', 588, 25, 20, 50),
  f('tavuk', 'Tavuk göğsü', 120, 22.5, 0, 2.6, { state: 'çiğ' }),
  f('hindi', 'Hindi göğsü', 114, 23.7, 0, 1.5, { state: 'çiğ' }),
  f('dana', 'Yağsız dana eti', 137, 21.4, 0, 5, { state: 'çiğ' }),
  f('somon', 'Somon', 208, 20.4, 0, 13.4, { state: 'çiğ' }),
  f('somon-pismis', 'Somon', 206, 22.1, 0, 12.4, { state: 'pişmiş' }),
  f('pirinc', 'Pirinç', 365, 7.1, 80, 0.7, { state: 'kuru' }),
  f('bulgur', 'Bulgur', 342, 12.3, 75.9, 1.3, { state: 'kuru' }),
  f('makarna', 'Makarna', 371, 13, 74.7, 1.5, { state: 'kuru' }),
  f('patates', 'Patates', 77, 2, 17.5, 0.1, { state: 'çiğ' }),
  f('sebze', 'Karışık sebze', 30, 1.5, 6, 0.3, { state: 'çiğ' }),
  f('salata', 'Salata (yeşillik, sossuz)', 20, 1.2, 3.5, 0.2, { state: 'çiğ' }),
  f('domates-sosu', 'Domates sosu', 40, 1.5, 7, 0.5),
  f('zeytinyagi', 'Zeytinyağı', 884, 0, 0, 100),
]

let n = 0
const i = (foodId: string, amount: number, unit: 'g' | 'adet' = 'g', assumption?: string): MealItem => ({
  id: `s${++n}`, foodId, amount, unit, ...(assumption && { assumption }),
})
const NOQ = 'Menüde miktar yok, varsayılan değer'
const domates = () => i('domates', 100, 'g', NOQ)
const salatalik = () => i('salatalik', 100, 'g', NOQ)
const salata = () => i('salata', 150, 'g', NOQ)

const meal = (id: string, name: string, time: string, items: MealItem[]): Meal => ({ id, name, time, items })
const first = (d: string, ...items: MealItem[]) => meal(`${d}-1`, 'İlk ana öğün', '12.00', items)
const snack = (d: string, ...items: MealItem[]) => meal(`${d}-2`, 'Ara öğün', '14.00–15.00', items)
const dinner = (d: string, ...items: MealItem[]) => meal(`${d}-3`, 'Akşam yemeği', '19.00–20.00', items)
const oats = (fruit: MealItem, ...more: MealItem[]) => [i('whey', 30), i('yulaf', 40), i('yogurt', 200), fruit, ...more]

export const PLAN: PlanDay[] = [
  { weekday: 0, dayType: 'rest', meals: [
    first('pzt', i('yumurta', 3, 'adet'), i('lor', 100), i('ekmek', 70), domates(), salatalik()),
    snack('pzt', ...oats(i('muz', 100))),
    dinner('pzt', i('tavuk', 250), i('pirinc', 75), i('yogurt', 200), salata(), i('zeytinyagi', 10)),
  ] },
  { weekday: 1, dayType: 'rest', meals: [
    first('sal', i('yumurta', 2, 'adet'), i('lor', 150), i('ekmek', 70), domates()),
    snack('sal', ...oats(i('muz', 100), i('fistik', 10))),
    dinner('sal', i('dana', 220), i('patates', 300), i('yogurt', 200), salata(), i('zeytinyagi', 5)),
  ] },
  { weekday: 2, dayType: 'rest', meals: [
    first('car', i('yumurta', 2, 'adet'), i('lor', 150), i('ekmek', 70), domates(), salatalik()),
    snack('car', ...oats(i('muz', 100))),
    dinner('car', i('hindi', 250), i('bulgur', 80), i('yogurt', 200), i('sebze', 200), i('zeytinyagi', 10)),
  ] },
  { weekday: 3, dayType: 'rest', meals: [
    first('per', i('yumurta', 3, 'adet'), i('lor', 100), i('ekmek', 60), domates(), salatalik()),
    snack('per', ...oats(i('elma', 150))),
    dinner('per', i('somon', 200, 'g', 'Tartım durumu kesin değil, çiğ varsayıldı'), i('patates', 300), i('yogurt', 200), salata()),
  ] },
  { weekday: 4, dayType: 'rest', meals: [
    first('cum', i('yumurta', 2, 'adet'), i('lor', 150), i('ekmek', 70), domates()),
    snack('cum', ...oats(i('muz', 100))),
    dinner('cum', i('tavuk', 250), i('makarna', 80), i('domates-sosu', 100, 'g', NOQ), i('yogurt', 200), salata(), i('zeytinyagi', 5)),
  ] },
  { weekday: 5, dayType: 'rest', meals: [
    first('cmt', i('yumurta', 2, 'adet'), i('lor', 150), i('ekmek', 70), domates(), salatalik()),
    snack('cmt', ...oats(i('muz', 100), i('fistik', 10))),
    dinner('cmt', i('dana', 220), i('bulgur', 80), i('sebze', 250, 'g', 'Menüde "kabak veya karışık sebze"'), i('yogurt', 200), i('zeytinyagi', 5)),
  ] },
  { weekday: 6, dayType: 'run', note: 'Sabah koşu: ~10 km, genellikle aç karnına, 70 dk+', meals: [
    meal('pzr-1', 'Koşu sonrası ilk öğün', 'Koşu sonrası', [
      i('yumurta', 3, 'adet'), i('lor', 100), i('ekmek', 80), i('muz', 1, 'adet', '1 muz ≈ 120 g varsayıldı'), domates(),
    ]),
    snack('pzr', i('whey', 30), i('yulaf', 40), i('yogurt', 200)),
    dinner('pzr', i('tavuk', 250), i('pirinc', 90), i('sebze', 200), i('yogurt', 200), i('zeytinyagi', 10)),
  ] },
]

export function seedData(): AppData {
  return structuredClone({
    version: 1 as const,
    // Personal values (age, height, weight) are left empty on purpose: entered in the app.
    profile: { startDate: '2026-10-27', periodWeeks: 8, waterTargetL: 3, weeklyWeightsTarget: 3, weeklyRunTarget: 1 },
    targets: {
      rest: { kcalMin: 1800, kcalMax: 1900, proteinMin: 160, proteinMax: 180 },
      weights: { kcalMin: 1900, kcalMax: 2000, proteinMin: 160, proteinMax: 180 },
      run: { kcalMin: 2100, kcalMax: 2300, proteinMin: 160, proteinMax: 180 },
    },
    foods: FOODS,
    plan: PLAN,
    recipes: [],
    days: {},
    workouts: [],
  })
}
