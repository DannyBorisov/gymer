import { useState } from "react";
import {
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Over,
  type Active,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Exercise, Program } from "../../../types/program";
import { parseContainerId } from "./ids";

interface UseExerciseDndArgs {
  program: Program;
  /** Move `exerciseId` to `toIndex` within `toWorkoutIndex` (arrayMove semantics). */
  moveExercise: (
    exerciseId: string,
    toWorkoutIndex: number,
    toIndex: number,
  ) => void;
}

interface UseExerciseDndResult {
  /** The exercise being dragged, for the DragOverlay. */
  activeExercise: Exercise | null;
  sensors: ReturnType<typeof useSensors>;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
}

const sortableIndex = (node: Active | Over): number | undefined =>
  (node.data.current?.sortable as { index: number } | undefined)?.index;

/**
 * Owns every @dnd-kit concern for the exercise grid.
 *
 * Cross-session moves apply live in `onDragOver` (the row must render in its new
 * session as you drag). Ordering *within* a session is left to SortableContext's
 * gap animation and committed once in `onDragEnd`; mutating the array every
 * `onDragOver` frame makes the pointer chase the moved row and skip slots.
 */
export const useExerciseDnd = ({
  program,
  moveExercise,
}: UseExerciseDndArgs): UseExerciseDndResult => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    // A small threshold so taps on the row's inputs still register as taps.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const findExercise = (id: string | null): Exercise | null => {
    if (!id) return null;
    for (const workout of program.workouts) {
      const found = workout.exercises.find((e) => e.id === id);
      if (found) return found;
    }
    return null;
  };

  const sessionOf = (exerciseId: string): number =>
    program.workouts.findIndex((w) =>
      w.exercises.some((e) => e.id === exerciseId),
    );

  /** Session + landing index for a drop target (an exercise row or a container). */
  const targetOf = (
    over: Over,
  ): { workoutIndex: number; index: number } | null => {
    const overId = String(over.id);

    const container = parseContainerId(overId);
    if (container !== null) return { workoutIndex: container, index: 0 };

    const workoutIndex = sessionOf(overId);
    if (workoutIndex === -1) return null;

    const index =
      sortableIndex(over) ??
      program.workouts[workoutIndex].exercises.findIndex(
        (e) => e.id === overId,
      );
    return { workoutIndex, index };
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dragId = String(active.id);
    if (String(over.id) === dragId) return;

    const target = targetOf(over);
    if (!target) return;

    // Reorder live so the gap tracks the pointer, within a session and across
    // sessions alike. `moveExercise` is a no-op when the position is unchanged,
    // so feeding it every frame is safe and does not oscillate.
    moveExercise(dragId, target.workoutIndex, target.index);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;
    if (!over) return;

    const dragId = String(active.id);
    if (String(over.id) === dragId) return;

    const target = targetOf(over);
    if (target) moveExercise(dragId, target.workoutIndex, target.index);
  };

  const onDragCancel = () => setActiveId(null);

  return {
    activeExercise: findExercise(activeId),
    sensors,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
  };
};
