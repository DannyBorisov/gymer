import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { WorkoutProvider } from "./contexts/WorkoutContext";
import { QuickWorkoutProvider } from "./contexts/QuickWorkoutContext";
import AppRoutes from "./Routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
};

export default App;
