import { useLocation, useNavigate } from "react-router-dom";
import { WorkoutDrawer } from "./WorkoutDrawer";
import ActiveWorkout from "../../pages/ActiveWorkout/ActiveWorkout";
import { parseExerciseName } from "../../types/shared";
import { useWorkout } from "../../contexts/WorkoutContext";
import { formatTime } from "../../lib/time";

const WorkoutDrawerOverlay = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeWorkout, workoutData, timer, currentExerciseIndex, duration } =
    useWorkout();
  const isWorkoutComplete = duration !== null;
  const isWorkoutRoute = location.pathname === "/workout";

  const handleClose = () => {
    navigate("/home");
  };

  // Get current exercise name (variant shown alongside, e.g. "Row · Wide Grip")
  const exerciseNames = [...new Set(workoutData.map((e) => e.exercise))];
  const currentFullName = exerciseNames[currentExerciseIndex] || "";
  const { name: currentName, variant: currentVariant } =
    parseExerciseName(currentFullName);
  const currentExerciseName = currentVariant
    ? `${currentName} · ${currentVariant}`
    : currentName;

  // Show drawer when on workout route OR when there's an active workout on other pages
  const shouldShowDrawer = !!(isWorkoutRoute || activeWorkout);

  const handlePeekTap = () => {
    navigate("/workout");
  };

  return (
    <WorkoutDrawer
      isOpen={shouldShowDrawer}
      onClose={handleClose}
      forceCollapsed={!isWorkoutRoute && !!activeWorkout}
      closeOnCollapse={isWorkoutComplete}
      onPeekTap={!isWorkoutRoute ? handlePeekTap : undefined}
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

export default WorkoutDrawerOverlay;
