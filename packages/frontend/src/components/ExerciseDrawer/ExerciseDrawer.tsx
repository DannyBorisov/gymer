import { useState, useEffect, useRef } from "react";
import { Search, X, Plus, Check } from "lucide-react";
import { uniqueExercises } from "../../data/exercises";
import { SwipeableDrawer } from "../SwipeableDrawer";
import styles from "./ExerciseDrawer.module.css";

interface ExerciseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exerciseName: string) => void;
  onSelectMultiple?: (exerciseNames: string[]) => void;
  currentValue?: string;
  multiSelect?: boolean;
  excludeExercises?: string[];
  includeOnly?: string[]; // If provided, only show these exercises
}

export const ExerciseDrawer = ({
  isOpen,
  onClose,
  onSelect,
  onSelectMultiple,
  currentValue = "",
  multiSelect = false,
  excludeExercises = [],
  includeOnly,
}: ExerciseDrawerProps) => {
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setCustomName(currentValue);
      setSelectedExercises([]);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, currentValue]);

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
    if (multiSelect) {
      setSelectedExercises((prev) =>
        prev.includes(name)
          ? prev.filter((e) => e !== name)
          : [...prev, name]
      );
    } else {
      onSelect(name);
      onClose();
    }
  };

  const handleAddCustom = () => {
    const name = customName.trim();
    if (name) {
      if (multiSelect) {
        if (!selectedExercises.includes(name)) {
          setSelectedExercises((prev) => [...prev, name]);
        }
        setSearch("");
        setCustomName("");
      } else {
        onSelect(name);
        onClose();
      }
    }
  };

  const handleConfirmMultiSelect = () => {
    if (onSelectMultiple && selectedExercises.length > 0) {
      onSelectMultiple(selectedExercises);
      onClose();
    }
  };

  // Filter exercises - always show flat list, filtered by search
  const baseExercises = includeOnly ? includeOnly : uniqueExercises;
  const filteredExercises = baseExercises
    .filter((ex) => !excludeExercises.includes(ex))
    .filter((ex) =>
      search.trim()
        ? ex.toLowerCase().includes(search.toLowerCase())
        : true
    );

  const showCustomOption =
    search.trim() &&
    !includeOnly && // Don't allow custom exercises when filtering to specific list
    !uniqueExercises.some(
      (ex) => ex.toLowerCase() === search.toLowerCase()
    ) &&
    !selectedExercises.includes(search.trim());

  return (
    <SwipeableDrawer isOpen={isOpen} onClose={onClose} maxHeight="85vh">
      <div className={styles.header}>
        <h2 className={styles.title}>
          {multiSelect ? "Select Exercises" : "Select Exercise"}
        </h2>
        <button onClick={onClose} className={styles.closeBtn}>
          <X size={20} />
        </button>
      </div>

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

      <div className={styles.content}>
        {showCustomOption && (
          <button
            onClick={handleAddCustom}
            className={styles.addCustomBtn}
          >
            <Plus size={16} />
            <span>Add "{search}"</span>
          </button>
        )}

        <div className={styles.exerciseList}>
          {filteredExercises.map((exercise) => {
            const isSelected = selectedExercises.includes(exercise);
            return (
              <button
                key={exercise}
                onClick={() => handleSelect(exercise)}
                className={`${styles.exerciseItem} ${isSelected ? styles.exerciseItemSelected : ""}`}
              >
                <span className={styles.exerciseName}>{exercise}</span>
                {multiSelect && (
                  <div className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ""}`}>
                    {isSelected && <Check size={14} />}
                  </div>
                )}
              </button>
            );
          })}

          {filteredExercises.length === 0 && !showCustomOption && (
            <div className={styles.noResults}>No exercises found</div>
          )}
        </div>
      </div>

      {multiSelect && selectedExercises.length > 0 && (
        <div className={styles.footer}>
          <button
            onClick={handleConfirmMultiSelect}
            className={styles.confirmBtn}
          >
            Add {selectedExercises.length} exercise{selectedExercises.length > 1 ? "s" : ""}
          </button>
        </div>
      )}
    </SwipeableDrawer>
  );
};
