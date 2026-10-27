import type { AppData } from '../types'
import { seedData } from '../data/seed'

// The only module that knows where data lives. Swap load/save for an API
// client to add cloud sync later; the rest of the app only sees AppData.
const KEY = 'fitness-tracker:v1'

export function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as AppData
  } catch (e) {
    console.error('Kayıtlı veri okunamadı', e)
  }
  return seedData()
}

export function save(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function clear(): void {
  localStorage.removeItem(KEY)
}

/** Ask the browser not to evict our data under storage pressure. */
export function requestPersistence(): void {
  navigator.storage?.persist?.().catch(() => {})
}
