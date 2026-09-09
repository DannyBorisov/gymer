import { createContext, useContext, useState, type ReactNode } from "react";
import { localStorage } from "../services/local-storage";

type WeightUnit = "kg" | "lbs";

interface ActiveProgram {
  id: string;
  name: string;
}

interface Settings {
  weightUnit: WeightUnit;
  showRestSuggestion: boolean;
  restTimerAnnounceInterval: number;
  activeProgram: ActiveProgram | null;
}

const DEFAULT_SETTINGS: Settings = {
  weightUnit: "kg",
  showRestSuggestion: true,
  restTimerAnnounceInterval: 60,
  activeProgram: null,
};

const STORAGE_KEY = "settings";

interface SettingsContextType {
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
  showRestSuggestion: boolean;
  setShowRestSuggestion: (show: boolean) => void;
  restTimerAnnounceInterval: number;
  setRestTimerAnnounceInterval: (seconds: number) => void;
  activeProgram: ActiveProgram | null;
  setActiveProgram: (program: ActiveProgram | null) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...localStorage.get<Partial<Settings>>(STORAGE_KEY, {}),
  }));

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.set(STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        weightUnit: settings.weightUnit,
        setWeightUnit: (weightUnit) => update({ weightUnit }),
        showRestSuggestion: settings.showRestSuggestion,
        setShowRestSuggestion: (showRestSuggestion) =>
          update({ showRestSuggestion }),

        restTimerAnnounceInterval: settings.restTimerAnnounceInterval,
        setRestTimerAnnounceInterval: (restTimerAnnounceInterval) =>
          update({ restTimerAnnounceInterval }),
        activeProgram: settings.activeProgram,
        setActiveProgram: (activeProgram) => update({ activeProgram }),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
