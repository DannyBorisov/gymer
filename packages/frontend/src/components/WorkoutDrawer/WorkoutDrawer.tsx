import { useRef, useState, useEffect, createContext, useContext } from "react";
import styles from "./WorkoutDrawer.module.css";

interface DrawerContextType {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const DrawerContext = createContext<DrawerContextType | null>(null);

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) {
    // Return default values when not inside drawer
    return { isExpanded: true, setIsExpanded: () => {} };
  }
  return context;
};

interface WorkoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  forceCollapsed?: boolean;
  onPeekTap?: () => void;
  peekContent?: {
    timer: string;
    exerciseName: string;
  };
}

export const WorkoutDrawer = ({
  isOpen,
  onClose: _onClose,
  children,
  forceCollapsed,
  onPeekTap,
  peekContent,
}: WorkoutDrawerProps) => {
  void _onClose; // Kept for API compatibility
  const [isExpanded, setIsExpanded] = useState(!forceCollapsed);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset expanded state based on forceCollapsed
  useEffect(() => {
    if (isOpen) {
      setIsExpanded(!forceCollapsed);
    }
  }, [isOpen, forceCollapsed]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    if (isExpanded) {
      // Only allow dragging down when expanded
      setDragY(Math.max(0, deltaY));
    } else {
      // Only allow dragging up when collapsed
      setDragY(Math.min(0, deltaY));
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    const threshold = 100;

    if (isExpanded && dragY > threshold) {
      // Collapse
      setIsExpanded(false);
    } else if (!isExpanded && dragY < -threshold) {
      // Expand
      setIsExpanded(true);
    }

    setIsDragging(false);
    setDragY(0);
  };

  const handlePeekTap = () => {
    if (!isExpanded) {
      if (onPeekTap) {
        onPeekTap();
      } else {
        setIsExpanded(true);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <DrawerContext.Provider value={{ isExpanded, setIsExpanded }}>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${isExpanded ? styles.backdropVisible : ""}`}
        onClick={() => setIsExpanded(false)}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`${styles.drawer} ${isExpanded ? styles.drawerExpanded : styles.drawerCollapsed}`}
        style={{
          transform: isDragging ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? "none" : undefined,
        }}
      >
        {/* Handle area */}
        <div
          className={styles.handleArea}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handlePeekTap}
        >
          <div className={styles.handle} />

          {/* Peek content - visible when collapsed */}
          {!isExpanded && peekContent && (
            <div className={styles.peekContent}>
              <span className={styles.peekTimer}>{peekContent.timer}</span>
              <span className={styles.peekExercise}>{peekContent.exerciseName}</span>
            </div>
          )}
        </div>

        {/* Main content */}
        <div
          ref={contentRef}
          className={styles.content}
          onTouchStart={(e) => {
            // Only allow drag from top of content when scrolled to top
            const scrollTop = contentRef.current?.scrollTop ?? 0;
            if (scrollTop <= 0) {
              handleTouchStart(e);
            }
          }}
          onTouchMove={(e) => {
            const scrollTop = contentRef.current?.scrollTop ?? 0;
            if (scrollTop <= 0 && isDragging) {
              handleTouchMove(e);
              e.preventDefault();
            }
          }}
          onTouchEnd={handleTouchEnd}
        >
          {children}
        </div>
      </div>
    </DrawerContext.Provider>
  );
};
