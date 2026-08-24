import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { WorkoutProvider } from "./contexts/WorkoutContext";
import { QuickWorkoutProvider } from "./contexts/QuickWorkoutContext";
import AppRoutes from "./Routes";

const App = () => {
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
