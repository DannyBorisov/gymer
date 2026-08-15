import { createContext, useContext, useState, type ReactNode } from 'react'

type WeightUnit = 'kg' | 'lbs'

interface SettingsContextType {
  weightUnit: WeightUnit
  setWeightUnit: (unit: WeightUnit) => void
}

const SettingsContext = createContext<SettingsContextType | null>(null)

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')

  return (
    <SettingsContext.Provider value={{ weightUnit, setWeightUnit }}>
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
