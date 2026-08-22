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

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = {
  duration: 0.08,
  ease: "easeOut" as const,
};

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
    style={{ height: "100%" }}
  >
    {children}
  </motion.div>
);

const ProtectedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <PageWrapper key={location.pathname}>
        <Routes location={location}>
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
      </PageWrapper>
    </AnimatePresence>
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
