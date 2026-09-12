import { GripVertical } from "lucide-react";
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import styles from "./DragHandle.module.css";

interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}

/** The grip that initiates a drag. Everything else on the row stays tappable. */
export const DragHandle = ({ attributes, listeners }: DragHandleProps) => (
  <button
    type="button"
    className={styles.handle}
    aria-label="Reorder exercise"
    {...attributes}
    {...listeners}
  >
    <GripVertical size={16} />
  </button>
);
