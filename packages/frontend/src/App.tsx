import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { WorkoutProvider } from "./contexts/WorkoutContext";
import { QuickWorkoutProvider } from "./contexts/QuickWorkoutContext";
import { endWorkoutLiveActivity } from "./utils/liveActivity";
import AppRoutes from "./Routes";

const App = () => {
  // End Live Activity when app is terminated/closed
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
      return;
    }

    const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        // App went to background - end Live Activity
        endWorkoutLiveActivity();
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <WorkoutProvider>
            <QuickWorkoutProvider>
              <AppRoutes />
            </QuickWorkoutProvider>
          </WorkoutProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
