import { useRef, useState } from "react";
import styles from "./SwipeableDrawer.module.css";

interface SwipeableDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
  dark?: boolean;
}

export const SwipeableDrawer = ({
  isOpen,
  onClose,
  children,
  maxHeight = "85vh",
  dark = false,
}: SwipeableDrawerProps) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const canDrag = useRef(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    // Always allow dragging from handle area
    touchStartY.current = e.touches[0].clientY;
    canDrag.current = true;
    setIsDragging(true);
  };

  // Check if element or any ancestor is a scrollable container
  const isWithinScrollableElement = (target: EventTarget | null): boolean => {
    let element = target as HTMLElement | null;
    while (element && element !== contentRef.current) {
      const style = window.getComputedStyle(element);
      const overflowY = style.overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        element.scrollHeight > element.clientHeight
      ) {
        return true;
      }
      element = element.parentElement;
    }
    return false;
  };

  const handleContentTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchStartY.current = e.touches[0].clientY;

    // Don't allow drag if touch started within a scrollable child element
    if (isWithinScrollableElement(e.target)) {
      canDrag.current = false;
      return;
    }

    // Only allow drag if content is scrolled to top
    const scrollTop = contentRef.current?.scrollTop ?? 0;
    canDrag.current = scrollTop <= 0;
  };

  const handleContentTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!canDrag.current) return;

    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Only start dragging if swiping down
    if (deltaY > 0) {
      setIsDragging(true);
      setDragY(deltaY);
      // Prevent scroll while dragging
      e.preventDefault();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    // Only allow dragging down
    setDragY(Math.max(0, deltaY));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    // Close if dragged more than 100px
    if (isDragging && dragY > 100) {
      onClose();
    }
    setIsDragging(false);
    setDragY(0);
    canDrag.current = false;
  };

  if (!isOpen) return null;

  const isFullHeight = maxHeight === "100vh";

  return (
    <>
      <div
        className={styles.backdrop}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      />
      <div
        ref={drawerRef}
        className={`${styles.drawer} ${isFullHeight ? styles.drawerFullHeight : ""} ${dark ? styles.dark : ""}`}
        style={{
          maxHeight: isFullHeight ? undefined : maxHeight,
          transform: isDragging ? `translateY(${dragY}px)` : "",
          transition: isDragging ? "none" : "",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.handleArea}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.handle} />
        </div>
        <div
          ref={contentRef}
          className={styles.content}
          onTouchStart={handleContentTouchStart}
          onTouchMove={handleContentTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {children}
        </div>
      </div>
    </>
  );
};
