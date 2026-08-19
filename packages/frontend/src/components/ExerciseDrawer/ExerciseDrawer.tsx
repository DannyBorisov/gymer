import { useState, useEffect, useRef } from "react";
import { Search, X, Plus } from "lucide-react";
import { exercisesByCategory, uniqueExercises } from "../../data/exercises";
import styles from "./ExerciseDrawer.module.css";

interface ExerciseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exerciseName: string) => void;
  currentValue?: string;
}

export const ExerciseDrawer = ({
  isOpen,
  onClose,
  onSelect,
  currentValue = "",
}: ExerciseDrawerProps) => {
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setCustomName(currentValue);
      // Focus search input when drawer opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, currentValue]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSelect = (name: string) => {
    onSelect(name);
    onClose();
  };

  const handleAddCustom = () => {
    if (customName.trim()) {
      onSelect(customName.trim());
      onClose();
    }
  };

  // Filter exercises based on search
  const filteredExercises = search.trim()
    ? uniqueExercises.filter((ex) =>
        ex.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const showCustomOption =
    search.trim() &&
    !uniqueExercises.some(
      (ex) => ex.toLowerCase() === search.toLowerCase()
    );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Drawer */}
      <div className={styles.drawer}>
        {/* Handle */}
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Select Exercise</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCustomName(e.target.value);
            }}
            placeholder="Search or add new exercise..."
            className={styles.searchInput}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className={styles.clearBtn}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Show filtered results */}
          {filteredExercises ? (
            <div className={styles.filteredList}>
              {/* Add custom option if no exact match */}
              {showCustomOption && (
                <button
                  onClick={handleAddCustom}
                  className={styles.addCustomBtn}
                >
                  <Plus size={16} />
                  <span>Add "{search}"</span>
                </button>
              )}

              {filteredExercises.length > 0 ? (
                filteredExercises.map((exercise) => (
                  <button
                    key={exercise}
                    onClick={() => handleSelect(exercise)}
                    className={styles.exerciseItem}
                  >
                    {exercise}
                  </button>
                ))
              ) : (
                !showCustomOption && (
                  <div className={styles.noResults}>No exercises found</div>
                )
              )}
            </div>
          ) : (
            /* Show categories */
            <div className={styles.categories}>
              {Object.entries(exercisesByCategory).map(([category, exercises]) => (
                <div key={category} className={styles.category}>
                  <h3 className={styles.categoryTitle}>{category}</h3>
                  <div className={styles.exerciseList}>
                    {exercises.map((exercise) => (
                      <button
                        key={exercise}
                        onClick={() => handleSelect(exercise)}
                        className={styles.exerciseChip}
                      >
                        {exercise}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
