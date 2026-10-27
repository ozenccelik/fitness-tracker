import { useEffect, useState, type ReactNode } from 'react'
import { num, parseNum } from '../lib/format'

export function Card({ title, right, children, className = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-700">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

/** Shows the real value even past the target; the bar just caps visually and turns amber. */
export function Progress({ label, value, min, max, unit }: { label: string; value: number | null; min: number; max: number; unit: string }) {
  const pct = value === null ? 0 : Math.min(100, (value / max) * 100)
  const state = value === null ? 'none' : value < min ? 'under' : value > max ? 'over' : 'ok'
  const color = { none: 'bg-stone-200', under: 'bg-sky-500', ok: 'bg-emerald-500', over: 'bg-amber-500' }[state]
  const note = { none: 'veri yok', under: 'hedefin altında', ok: 'hedefte', over: 'hedefin üstünde' }[state]
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-stone-600">{label}</span>
        <span className="tabular-nums">
          <b>{value === null ? '—' : num(value)}</b> <span className="text-stone-500">/ {num(min)}–{num(max)} {unit}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-0.5 text-xs text-stone-500">{note}</div>
    </div>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, size = 'md' }: {
  value: T | undefined
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'} font-medium transition-colors ${
            o.value === value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Text input that accepts "109,8"; commits on blur or Enter. Empty commits undefined. */
export function NumField({ value, onCommit, digits = 0, className = '', ...rest }: {
  value: number | undefined
  onCommit: (v: number | undefined) => void
  digits?: number
  className?: string
  placeholder?: string
  'aria-label'?: string
}) {
  const show = (v: number | undefined) => (v === undefined ? '' : num(v, digits).replace(/\./g, ''))
  const [text, setText] = useState(show(value))
  useEffect(() => setText(show(value)), [value])
  const commit = () => {
    const v = parseNum(text)
    if (v !== value) onCommit(v)
    else setText(show(value))
  }
  return (
    <input
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={`rounded-lg border border-stone-300 bg-white px-2 py-1.5 tabular-nums focus:border-stone-500 focus:outline-none ${className}`}
      {...rest}
    />
  )
}

export const Badge = ({ children, tone = 'stone' }: { children: ReactNode; tone?: 'stone' | 'amber' | 'emerald' | 'sky' }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${{
    stone: 'bg-stone-100 text-stone-600',
    amber: 'bg-amber-100 text-amber-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    sky: 'bg-sky-100 text-sky-800',
  }[tone]}`}>
    {children}
  </span>
)

export const Btn = ({ children, onClick, tone = 'ghost', className = '', type = 'button' }: {
  children: ReactNode
  onClick?: () => void
  tone?: 'primary' | 'ghost' | 'danger'
  className?: string
  type?: 'button' | 'submit'
}) => (
  <button
    type={type}
    onClick={onClick}
    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${{
      primary: 'bg-stone-900 text-white hover:bg-stone-700',
      ghost: 'bg-stone-100 text-stone-700 hover:bg-stone-200',
      danger: 'bg-red-50 text-red-700 hover:bg-red-100',
    }[tone]} ${className}`}
  >
    {children}
  </button>
)
