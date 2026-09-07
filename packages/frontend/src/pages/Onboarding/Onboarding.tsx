import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useGetPrograms } from "../../api/programs";
import { useGetWorkoutHistory } from "../../api/workouts";
import { useSettings } from "../../contexts/SettingsContext";
import styles from "./Onboarding.module.css";

const Onboarding = () => {
  const navigate = useNavigate();
  const { activeProgram } = useSettings();
  const {
    data: programsData,
    isLoading: isLoadingPrograms,
    error: programsError,
  } = useGetPrograms();
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError,
  } = useGetWorkoutHistory();

  const programs = programsData?.programs ?? [];
  const hasWorkoutHistory = (historyData?.workouts ?? []).some(
    (workout) => workout !== null,
  );
  const hasValidActiveProgram = programs.some(
    (program) => program.id === activeProgram?.id,
  );

  useEffect(() => {
    if (
      isLoadingPrograms ||
      isLoadingHistory ||
      programsError ||
      historyError
    ) {
      return;
    }

    if (programs.length === 0) {
      navigate(hasWorkoutHistory ? "/home" : "/programs/create", {
        replace: true,
      });
      return;
    }

    navigate(hasValidActiveProgram ? "/home" : "/programs", {
      replace: true,
    });
  }, [
    hasValidActiveProgram,
    hasWorkoutHistory,
    historyError,
    isLoadingHistory,
    isLoadingPrograms,
    navigate,
    programs.length,
    programsError,
  ]);

  if (programsError || historyError) {
    const error = programsError || historyError;
    return (
      <div className={styles.errorState}>
        <p>
          {error instanceof Error
            ? error.message
            : "Unable to prepare your workspace"}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.loadingState} role="status">
      <Loader2 size={24} className={styles.spinner} />
      <span>Preparing your training space...</span>
    </div>
  );
};

export default Onboarding;
