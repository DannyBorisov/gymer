import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout/Layout";
import { WorkoutDrawerOverlay } from "./components/WorkoutDrawer";
import PageWrapper from "./components/PageWrapper";
import OnboardingGate from "./components/OnboardingGate";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Login/Login";
import Home from "./pages/Home/Home";
import Programs from "./pages/Programs/Programs";
import ProgramDetail from "./pages/ProgramDetail/ProgramDetail";
import CreateProgram from "./pages/CreateProgram/CreateProgram";
import QuickWorkout from "./pages/QuickWorkout/QuickWorkout";
import WorkoutHistory from "./pages/WorkoutHistory/WorkoutHistory";
import Analytics from "./pages/Analytics/Analytics";
import Profile from "./pages/Profile/Profile";
import LegalPage from "./pages/Legal/LegalPage";
import Onboarding from "./pages/Onboarding/Onboarding";
import OnboardingSetup from "./pages/OnboardingSetup/OnboardingSetup";

const ProtectedRoutes = () => {
  const location = useLocation();
  const isWorkoutRoute = location.pathname === "/workout";

  const displayLocation = isWorkoutRoute
    ? { ...location, pathname: "/home" }
    : location;

  return (
    <OnboardingGate>
      <AnimatePresence mode="wait">
        <PageWrapper key={displayLocation.pathname}>
          <Routes location={displayLocation}>
            <Route path="/welcome" element={<Onboarding />} />
            <Route path="/onboarding" element={<OnboardingSetup />} />
            <Route path="/home" element={<Home />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/create" element={<CreateProgram />} />
            <Route path="/programs/:id/edit" element={<CreateProgram />} />
            <Route path="/programs/:id" element={<ProgramDetail />} />
            <Route path="/workout" element={<Home />} />
            <Route path="/quick-workout" element={<QuickWorkout />} />
            <Route path="/history" element={<WorkoutHistory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </PageWrapper>
      </AnimatePresence>
      <WorkoutDrawerOverlay />
    </OnboardingGate>
  );
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/terms" element={<LegalPage />} />
    <Route path="/privacy" element={<LegalPage />} />
    <Route path="/delete-account" element={<LegalPage />} />
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
