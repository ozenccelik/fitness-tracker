import { useEffect, useState } from 'react'
import type { AppData } from './types'
import { today } from './lib/dates'
import { seedData } from './data/seed'
import { clear, load, requestPersistence, save } from './lib/storage'
import { Today } from './components/Today'
import { PlanPage } from './components/PlanPage'
import { ProgressPage } from './components/ProgressPage'
import { SettingsPage } from './components/SettingsPage'

const TABS = [
  { id: 'today', label: 'Bugün', icon: '☀️' },
  { id: 'plan', label: 'Plan', icon: '🍽️' },
  { id: 'progress', label: 'İlerleme', icon: '📈' },
  { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
] as const
type Tab = (typeof TABS)[number]['id']

export default function App() {
  const [data, setData] = useState<AppData>(load)
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(today)

  useEffect(() => {
    try {
      save(data)
    } catch (e) {
      alert(`Veri kaydedilemedi: ${(e as Error).message}. JSON yedeği almayı unutma.`)
    }
  }, [data])
  useEffect(requestPersistence, [])

  /** Every change works on a copy, so React sees a new object and nothing is mutated in place. */
  const update = (fn: (d: AppData) => void) =>
    setData((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-28 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">Takip</h1>
        <span className="text-xs text-stone-500">{TABS.find((t) => t.id === tab)!.label}</span>
      </header>
      {tab === 'today' && <Today data={data} update={update} date={date} setDate={setDate} />}
      {tab === 'plan' && <PlanPage data={data} update={update} />}
      {tab === 'progress' && <ProgressPage data={data} />}
      {tab === 'settings' && <SettingsPage data={data} update={update} replace={setData} reset={() => { clear(); setData(seedData()) }} />}
      <nav className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`flex flex-1 flex-col items-center py-2 text-xs ${tab === t.id ? 'font-semibold text-stone-900' : 'text-stone-500'}`}>
              <span className="text-lg" aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
