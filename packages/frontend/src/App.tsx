import { useEffect } from "react";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { WorkoutProvider } from "./contexts/WorkoutContext";
import { QuickWorkoutProvider } from "./contexts/QuickWorkoutContext";
import AppRoutes from "./Routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setupNotificationListeners } from "./utils/notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

// Inner component that has access to router context
const AppContent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setupNotificationListeners(navigate);
  }, [navigate]);

  return (
    <AuthProvider>
      <SettingsProvider>
        <WorkoutProvider>
          <QuickWorkoutProvider>
            <AppRoutes />
          </QuickWorkoutProvider>
        </WorkoutProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
