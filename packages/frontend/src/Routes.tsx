import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout/Layout";
import { WorkoutDrawer } from "./components/WorkoutDrawer";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Login/Login";
import Home from "./pages/Home/Home";
import Programs from "./pages/Programs/Programs";
import ProgramDetail from "./pages/ProgramDetail/ProgramDetail";
import CreateProgram from "./pages/CreateProgram/CreateProgram";
import ActiveWorkout from "./pages/ActiveWorkout/ActiveWorkout";
import QuickWorkout from "./pages/QuickWorkout/QuickWorkout";
import WorkoutHistory from "./pages/WorkoutHistory/WorkoutHistory";
import Analytics from "./pages/Analytics/Analytics";
import Profile from "./pages/Profile/Profile";
import LegalPage from "./pages/Legal/LegalPage";
import { useWorkout } from "./contexts/WorkoutContext";
import { formatTime } from "./lib/time";

const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.08, ease: "easeOut" }}
      style={{ height: "100%" }}
    >
      {children}
    </motion.div>
  );
};

const WorkoutDrawerOverlay = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeWorkout, workoutData, timer, currentExerciseIndex } = useWorkout();
  const isWorkoutRoute = location.pathname === "/workout";

  const handleClose = () => {
    navigate("/home");
  };

  // Get current exercise name
  const exerciseNames = [...new Set(workoutData.map((e) => e.exercise))];
  const currentExerciseName = exerciseNames[currentExerciseIndex] || "";

  return (
    <WorkoutDrawer
      isOpen={isWorkoutRoute}
      onClose={handleClose}
      peekContent={
        activeWorkout
          ? {
              timer: formatTime(timer),
              exerciseName: currentExerciseName,
            }
          : undefined
      }
    >
      <ActiveWorkout />
    </WorkoutDrawer>
  );
};

const ProtectedRoutes = () => {
  const location = useLocation();
  const isWorkoutRoute = location.pathname === "/workout";

  // Filter out workout route from normal page transitions
  const displayLocation = isWorkoutRoute
    ? { ...location, pathname: "/home" } // Show home behind drawer
    : location;

  return (
    <>
      <AnimatePresence mode="wait">
        <PageWrapper key={displayLocation.pathname}>
          <Routes location={displayLocation}>
            {/* Main routes */}
            <Route path="/home" element={<Home />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/create" element={<CreateProgram />} />
            <Route path="/programs/:id" element={<ProgramDetail />} />
            <Route path="/workout" element={<Home />} />
            <Route path="/quick-workout" element={<QuickWorkout />} />
            <Route path="/history" element={<WorkoutHistory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />

            {/* Legacy redirects */}
            <Route path="/workouts" element={<Navigate to="/history" replace />} />
            <Route path="/start-workout" element={<Navigate to="/home" replace />} />
            <Route path="/weight" element={<Navigate to="/profile" replace />} />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </PageWrapper>
      </AnimatePresence>
      <WorkoutDrawerOverlay />
    </>
  );
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/terms" element={<LegalPage />} />
    <Route path="/privacy" element={<LegalPage />} />
    <Route
      path="/*"
      element={
        <Layout>
          <ProtectedRoute>
            <ProtectedRoutes />
          </ProtectedRoute>
        </Layout>
      }
    />
  </Routes>
);

export default AppRoutes;
