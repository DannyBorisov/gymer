import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExerciseRow, type ExerciseRowProps } from "../components/ExerciseRow";
import { DragHandle } from "./DragHandle";
import styles from "./SortableExerciseRow.module.css";

type SortableExerciseRowProps = Omit<ExerciseRowProps, "handle"> & {
  id: string;
};

/** Adds drag behaviour around a plain ExerciseRow. */
export const SortableExerciseRow = ({
  id,
  ...rowProps
}: SortableExerciseRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? styles.dragging : undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <ExerciseRow
        {...rowProps}
        handle={<DragHandle attributes={attributes} listeners={listeners} />}
      />
    </div>
  );
};
