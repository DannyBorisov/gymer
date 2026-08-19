import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { WorkoutProvider } from "./contexts/WorkoutContext";
import { QuickWorkoutProvider } from "./contexts/QuickWorkoutContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout/Layout";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Login/Login";
import Programs from "./pages/Programs/Programs";
import ProgramDetail from "./pages/ProgramDetail/ProgramDetail";
import CreateProgram from "./pages/CreateProgram/CreateProgram";
import QuickWorkout from "./pages/QuickWorkout/QuickWorkout";
import Weight from "./pages/Weight/Weight";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <WorkoutProvider>
            <QuickWorkoutProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/programs" element={<Programs />} />
                          <Route
                            path="/programs/create"
                            element={<CreateProgram />}
                          />
                          <Route
                            path="/programs/:id"
                            element={<ProgramDetail />}
                          />
                          <Route
                            path="/quick-workout"
                            element={<QuickWorkout />}
                          />
                          <Route path="/weight" element={<Weight />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </QuickWorkoutProvider>
          </WorkoutProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
