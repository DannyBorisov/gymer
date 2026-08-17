import { createContext, useContext, useState, type ReactNode } from 'react'

type WeightUnit = 'kg' | 'lbs'

interface SettingsContextType {
  weightUnit: WeightUnit
  setWeightUnit: (unit: WeightUnit) => void
  showRestSuggestion: boolean
  setShowRestSuggestion: (show: boolean) => void
  restTimerDuration: number
  setRestTimerDuration: (seconds: number) => void
}

const SettingsContext = createContext<SettingsContextType | null>(null)

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [showRestSuggestion, setShowRestSuggestionState] = useState<boolean>(() => {
    const saved = localStorage.getItem('showRestSuggestion')
    return saved !== null ? saved === 'true' : true
  })
  const [restTimerDuration, setRestTimerDurationState] = useState<number>(() => {
    const saved = localStorage.getItem('restTimerDuration')
    return saved !== null ? parseInt(saved, 10) : 90
  })

  const setShowRestSuggestion = (show: boolean) => {
    setShowRestSuggestionState(show)
    localStorage.setItem('showRestSuggestion', String(show))
  }

  const setRestTimerDuration = (seconds: number) => {
    setRestTimerDurationState(seconds)
    localStorage.setItem('restTimerDuration', String(seconds))
  }

  return (
    <SettingsContext.Provider value={{
      weightUnit,
      setWeightUnit,
      showRestSuggestion,
      setShowRestSuggestion,
      restTimerDuration,
      setRestTimerDuration
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
