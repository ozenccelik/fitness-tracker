const cache = new Map<number, Intl.NumberFormat>()

/** Turkish number format: 109,8 · 1.850 */
export function num(n: number, digits = 0): string {
  if (!cache.has(digits)) cache.set(digits, new Intl.NumberFormat('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits }))
  return cache.get(digits)!.format(n)
}

export const signed = (n: number, digits = 1) => (n > 0 ? '+' : n < 0 ? '−' : '±') + num(Math.abs(n), digits)

/** Accepts "109,8" or "109.8"; returns undefined for empty or invalid input. */
export function parseNum(s: string): number | undefined {
  const t = s.trim().replace(',', '.')
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

export const uid = () => crypto.randomUUID().slice(0, 8)
