import { useState } from "react";
import { MoreVertical, Copy, Loader2 } from "lucide-react";
import { PencilIcon, TrashIcon } from "../../assets/icons";
import { SwipeableDrawer } from "../../components/SwipeableDrawer/SwipeableDrawer";
import styles from "./ProgramMenu.module.css";

export interface ProgramMenuProps {
  programName: string;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  isCopying?: boolean;
  isDeleting?: boolean;
}

export const ProgramMenu = ({
  programName,
  onEdit,
  onCopy,
  onDelete,
  isCopying,
  isDeleting,
}: ProgramMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isBusy = isCopying || isDeleting;

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Program options"
        disabled={isBusy}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
      >
        {isBusy ? (
          <Loader2 size={18} className={styles.spinner} />
        ) : (
          <MoreVertical size={18} />
        )}
      </button>

      <SwipeableDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} dark>
        <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
          <span className={styles.sheetTitle}>{programName}</span>
          <button
            type="button"
            className={styles.sheetItem}
            onClick={() => handleAction(onEdit)}
          >
            <PencilIcon size={18} />
            <span>Edit</span>
          </button>
          <button
            type="button"
            className={styles.sheetItem}
            disabled={isCopying}
            onClick={() => handleAction(onCopy)}
          >
            {isCopying ? <Loader2 size={18} className={styles.spinner} /> : <Copy size={18} />}
            <span>Copy</span>
          </button>
          <button
            type="button"
            className={`${styles.sheetItem} ${styles.sheetItemDanger}`}
            disabled={isDeleting}
            onClick={() => handleAction(onDelete)}
          >
            {isDeleting ? <Loader2 size={18} className={styles.spinner} /> : <TrashIcon size={18} />}
            <span>Delete</span>
          </button>
        </div>
      </SwipeableDrawer>
    </>
  );
};
