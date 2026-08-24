import { useRef, useState } from "react";
import styles from "./SwipeableDrawer.module.css";

interface SwipeableDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
}

export const SwipeableDrawer = ({
  isOpen,
  onClose,
  children,
  maxHeight = "85vh",
}: SwipeableDrawerProps) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    // Only allow dragging down
    setDragY(Math.max(0, deltaY));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Close if dragged more than 100px
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div
        ref={drawerRef}
        className={styles.drawer}
        style={{
          maxHeight,
          transform: isDragging ? `translateY(${dragY}px)` : "",
          transition: isDragging ? "none" : "",
        }}
      >
        <div
          className={styles.handleArea}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.handle} />
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </>
  );
};
