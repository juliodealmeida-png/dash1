import { createContext, useContext, useMemo, useState } from 'react'

export type DateRange = { from: string; to: string }

export type GlobalFilters = {
  dateRange: DateRange
  search: string
  dealStage: string
  leadStatus: string
  leadSource: string
  signalSeverity: string
}

type FiltersState = {
  filters: GlobalFilters
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilters>>
}

const FiltersContext = createContext<FiltersState | null>(null)

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 30)

  const [filters, setFilters] = useState<GlobalFilters>({
    dateRange: { from: isoDate(start), to: isoDate(today) },
    search: '',
    dealStage: '',
    leadStatus: '',
    leadSource: '',
    signalSeverity: '',
  })

  const value = useMemo(() => ({ filters, setFilters }), [filters])
  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}

export function useFilters() {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error('FiltersContext ausente')
  return ctx
}
