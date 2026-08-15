import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout/Layout";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import WorkoutHistory from "./pages/WorkoutHistory/WorkoutHistory";
import Programs from "./pages/Programs/Programs";
import ProgramDetail from "./pages/ProgramDetail/ProgramDetail";
import CreateProgram from "./pages/CreateProgram/CreateProgram";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/history" element={<WorkoutHistory />} />
                    <Route path="/programs" element={<Programs />} />
                    <Route path="/programs/create" element={<CreateProgram />} />
                    <Route path="/programs/:id" element={<ProgramDetail />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
