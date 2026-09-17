import { useLocation, Navigate } from "react-router-dom";
import { useGetOnboarding } from "../api/onboarding";

// Blocks the app until onboarding is complete.
const OnboardingGate = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { data, isLoading } = useGetOnboarding();

  if (isLoading) return null;

  const isComplete = data?.onboarding?.isComplete ?? false;
  const onOnboarding = location.pathname === "/onboarding";
  const isDev = import.meta.env.DEV;

  if (!isComplete && !onOnboarding && !isDev) {
    return <Navigate to="/onboarding" replace />;
  }
  // Note: a completed user can still be on /onboarding mid-flow (the
  // notifications/plan steps run after isComplete flips true), so we don't
  // bounce away from here. OnboardingSetup itself starts a completed user
  // straight at the notifications step instead of re-showing the form.

  return <>{children}</>;
};

export default OnboardingGate;
