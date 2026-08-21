import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout/Layout";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Login/Login";
import Programs from "./pages/Programs/Programs";
import ProgramDetail from "./pages/ProgramDetail/ProgramDetail";
import CreateProgram from "./pages/CreateProgram/CreateProgram";
import ActiveWorkout from "./pages/ActiveWorkout/ActiveWorkout";
import QuickWorkout from "./pages/QuickWorkout/QuickWorkout";
import Weight from "./pages/Weight/Weight";
import Analytics from "./pages/Analytics/Analytics";
import StartWorkout from "./pages/StartWorkout/StartWorkout";
import WorkoutHistory from "./pages/WorkoutHistory/WorkoutHistory";
import Profile from "./pages/Profile/Profile";

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route
      path="/*"
      element={
        <Layout>
          <ProtectedRoute>
            <Routes>
              <Route path="/programs" element={<Programs />} />
              <Route path="/programs/create" element={<CreateProgram />} />
              <Route path="/programs/:id" element={<ProgramDetail />} />
              <Route path="/workout" element={<ActiveWorkout />} />
              <Route path="/quick-workout" element={<QuickWorkout />} />
              <Route path="/weight" element={<Weight />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/workouts" element={<WorkoutHistory />} />
              <Route path="/start-workout" element={<StartWorkout />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </ProtectedRoute>
        </Layout>
      }
    />
  </Routes>
);

export default AppRoutes;
