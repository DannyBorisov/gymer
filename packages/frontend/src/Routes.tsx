import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
  const isWorkoutRoute = location.pathname === "/workout";

  return (
    <AnimatePresence>
      {isWorkoutRoute && (
        <motion.div
          key="workout-drawer"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <ActiveWorkout />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ProtectedRoutes = () => {
  const location = useLocation();
  const isWorkoutRoute = location.pathname === "/workout";

  // Filter out workout route from normal page transitions
  const displayLocation = isWorkoutRoute
    ? { ...location, pathname: "/start-workout" } // Show start-workout behind drawer
    : location;

  return (
    <>
      <AnimatePresence mode="wait">
        <PageWrapper key={displayLocation.pathname}>
          <Routes location={displayLocation}>
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/create" element={<CreateProgram />} />
            <Route path="/programs/:id" element={<ProgramDetail />} />
            <Route path="/workout" element={<StartWorkout />} />
            <Route path="/quick-workout" element={<QuickWorkout />} />
            <Route path="/weight" element={<Weight />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/workouts" element={<WorkoutHistory />} />
            <Route path="/start-workout" element={<StartWorkout />} />
            <Route path="/profile" element={<Profile />} />
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
