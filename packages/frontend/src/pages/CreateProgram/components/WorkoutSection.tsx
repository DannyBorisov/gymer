import { useState } from "react";
import { Plus } from "lucide-react";
import { TrashIcon, ChevronRightIcon } from "../../../assets/icons";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Exercise, Workout } from "../../../types/program";
import { SortableExerciseRow } from "../dnd/SortableExerciseRow";
import { containerId } from "../dnd/ids";
import styles from "../CreateProgram.module.css";

export interface WorkoutSectionProps {
  workout: Workout;
  workoutIndex: number;
  onUpdateName: (name: string) => void;
  onRemove: () => void;
  onOpenAddDrawer: () => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  onUpdateExercise: (
    exerciseIndex: number,
    field: keyof Exercise,
    value: string | number | boolean,
  ) => void;
  canRemove: boolean;
  onOpenEditDrawer: (exerciseIndex: number) => void;
  showRir: boolean;
  dynamicRir: boolean;
}

/** Empty sessions still need a drop target so an exercise can be dragged in. */
const EmptySessionDropZone = ({ workoutIndex }: { workoutIndex: number }) => {
  const { setNodeRef, isOver } = useDroppable({ id: containerId(workoutIndex) });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.emptyExercises} ${isOver ? styles.emptyExercisesOver : ""}`}
    >
      <p>Drag an exercise here or add one below</p>
    </div>
  );
};

export const WorkoutSection = ({
  workout,
  workoutIndex,
  onUpdateName,
  onRemove,
  onOpenAddDrawer,
  onRemoveExercise,
  onUpdateExercise,
  canRemove,
  onOpenEditDrawer,
  showRir,
  dynamicRir,
}: WorkoutSectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const itemIds = workout.exercises.map((e) => e.id ?? "");

  return (
    <div className={styles.workoutSection}>
      <div className={styles.workoutHeader}>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={styles.collapseBtn}
        >
          <ChevronRightIcon
            size={16}
            className={`${styles.chevron} ${!isCollapsed ? styles.chevronOpen : ""}`}
          />
        </button>
        <span className={styles.workoutLabel}>Session {workoutIndex + 1}</span>
        <input
          type="text"
          value={workout.name}
          onChange={(e) => onUpdateName(e.target.value)}
          className={styles.workoutNameInput}
          placeholder="Workout name"
        />
        <button
          type="button"
          onClick={onRemove}
          className={styles.removeWorkoutBtn}
          disabled={!canRemove}
        >
          <TrashIcon size={14} />
        </button>
      </div>

      {!isCollapsed && (
        <div className={styles.exercisesTable}>
          {workout.exercises.length > 0 && (
            <div className={styles.tableHeader}>
              <span />
              <span className={styles.colNum}>#</span>
              <span className={styles.colExercise}>Exercise</span>
              <span className={styles.colSets}>Sets</span>
              <span className={styles.colReps}>Reps</span>
              {showRir && <span className={styles.colRir}>RIR</span>}
              {dynamicRir && <span className={styles.colRir}>RIR</span>}
              <span className={styles.colAction} />
            </div>
          )}
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            {workout.exercises.length === 0 ? (
              <EmptySessionDropZone workoutIndex={workoutIndex} />
            ) : (
              workout.exercises.map((exercise, exerciseIndex) => (
                <SortableExerciseRow
                  key={exercise.id}
                  id={exercise.id ?? ""}
                  exercise={exercise}
                  index={exerciseIndex}
                  onUpdate={(field, value) =>
                    onUpdateExercise(exerciseIndex, field, value)
                  }
                  onRemove={() => onRemoveExercise(exerciseIndex)}
                  onOpenDrawer={() => onOpenEditDrawer(exerciseIndex)}
                  showRir={showRir}
                  dynamicRir={dynamicRir}
                />
              ))
            )}
          </SortableContext>
          <button
            type="button"
            onClick={onOpenAddDrawer}
            className={styles.addExerciseBtn}
          >
            <Plus size={14} />
            Add Exercises
          </button>
        </div>
      )}
    </div>
  );
};
