import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Check } from "lucide-react";
import { MagnifierIcon, CrossIcon } from "../../assets/icons";
import {
  useExercises,
  useCreateExercise,
  type MuscleGroup,
} from "../../api/exercises";
import { SwipeableDrawer } from "../SwipeableDrawer";
import { Button, ButtonVariant } from "../ui/Button";
import { Input } from "../Input/Input";
import styles from "./ExerciseDrawer.module.css";

const CATEGORIES: MuscleGroup[] = [
  "ABS",
  "BACK",
  "BICEPS",
  "CHEST",
  "LEGS",
  "SHOULDERS",
  "TRICEPS",
];

const capitalize = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase();

interface ExerciseOption {
  display: string; // "Name (Variant)" - used for select/exclude/current-value matching
  name: string;
  variant: string;
  muscleGroup: MuscleGroup;
}

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
  const [activeCategory, setActiveCategory] = useState<MuscleGroup | "ALL">(
    "ALL"
  );
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] =
    useState<MuscleGroup | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data } = useExercises();
  const { mutate: createExercise, isPending: isCreatingExercise } =
    useCreateExercise();
  const exerciseOptions = useMemo<ExerciseOption[]>(() => {
    const options = (data?.exercises ?? []).map((ex) => {
      const variant = ex.variant.join(", ");
      return {
        display: variant ? `${ex.name} (${variant})` : ex.name,
        name: ex.name,
        variant,
        muscleGroup: ex.muscleGroup,
      };
    });
    const seen = new Set<string>();
    return options
      .filter((opt) => {
        if (seen.has(opt.display)) return false;
        seen.add(opt.display);
        return true;
      })
      .sort((a, b) => a.display.localeCompare(b.display));
  }, [data]);
  const uniqueExercises = useMemo(
    () => exerciseOptions.map((opt) => opt.display),
    [exerciseOptions]
  );

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setCustomName(currentValue);
      setSelectedExercises([]);
      setActiveCategory("ALL");
      setIsAddingExercise(false);
      setNewExerciseName("");
      setNewExerciseMuscleGroup(null);
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

  const handleSaveNewExercise = () => {
    const name = newExerciseName.trim();
    if (!name || !newExerciseMuscleGroup) return;

    createExercise(
      { name, muscleGroup: newExerciseMuscleGroup },
      {
        onSuccess: () => {
          if (multiSelect) {
            if (!selectedExercises.includes(name)) {
              setSelectedExercises((prev) => [...prev, name]);
            }
            setIsAddingExercise(false);
            setNewExerciseName("");
            setNewExerciseMuscleGroup(null);
          } else {
            onSelect(name);
            onClose();
          }
        },
      }
    );
  };

  // Filter exercises - always show flat list, filtered by category + search
  const baseOptions = includeOnly
    ? includeOnly.map((name) => {
        const match = exerciseOptions.find((opt) => opt.display === name);
        return (
          match ?? {
            display: name,
            name,
            variant: "",
            muscleGroup: undefined as unknown as MuscleGroup,
          }
        );
      })
    : exerciseOptions;
  const filteredOptions = baseOptions
    .filter((opt) => !excludeExercises.includes(opt.display))
    .filter((opt) =>
      includeOnly || activeCategory === "ALL"
        ? true
        : opt.muscleGroup === activeCategory
    )
    .filter((opt) =>
      search.trim()
        ? opt.display.toLowerCase().includes(search.toLowerCase())
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
    <SwipeableDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxHeight="85vh"
      minHeight="85vh"
    >
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isAddingExercise
            ? "Add Exercise"
            : multiSelect
              ? "Select Exercises"
              : "Select Exercise"}
        </h2>
      </div>

      {isAddingExercise ? (
        <div className={`${styles.content} ${styles.addExerciseForm}`}>
          <Input
            label="Exercise name"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            placeholder="e.g. Cable Face Pull"
            autoFocus
          />

          <div className={styles.muscleGroupLabel}>Muscle group</div>
          <div className={styles.muscleGroupChips}>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setNewExerciseMuscleGroup(category)}
                className={`${styles.categoryTab} ${newExerciseMuscleGroup === category ? styles.categoryTabActive : ""}`}
              >
                {capitalize(category)}
              </button>
            ))}
          </div>

          <div className={styles.addExerciseActions}>
            <Button
              variant={ButtonVariant.Secondary}
              onClick={() => setIsAddingExercise(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNewExercise}
              disabled={
                !newExerciseName.trim() ||
                !newExerciseMuscleGroup ||
                isCreatingExercise
              }
            >
              {isCreatingExercise ? "Saving..." : "Save exercise"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.searchContainer}>
            <MagnifierIcon size={18} className={styles.searchIcon} />
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
                <CrossIcon size={16} />
              </button>
            )}
          </div>

          {!includeOnly && (
            <div className={styles.categoryTabs}>
              <button
                type="button"
                onClick={() => setActiveCategory("ALL")}
                className={`${styles.categoryTab} ${activeCategory === "ALL" ? styles.categoryTabActive : ""}`}
              >
                All
              </button>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`${styles.categoryTab} ${activeCategory === category ? styles.categoryTabActive : ""}`}
                >
                  {capitalize(category)}
                </button>
              ))}
            </div>
          )}

          <div className={styles.content}>
            {!includeOnly && !search.trim() && (
              <button
                onClick={() => setIsAddingExercise(true)}
                className={styles.addCustomBtn}
              >
                <Plus size={16} />
                <span>Add exercise</span>
              </button>
            )}

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
              {filteredOptions.map((option) => {
                const isSelected = selectedExercises.includes(option.display);
                return (
                  <button
                    key={option.display}
                    onClick={() => handleSelect(option.display)}
                    className={`${styles.exerciseItem} ${isSelected ? styles.exerciseItemSelected : ""}`}
                  >
                    <span className={styles.exerciseName}>
                      {option.name}
                      {option.variant && (
                        <span className={styles.variantChip}>{option.variant}</span>
                      )}
                    </span>
                    {multiSelect && (
                      <div className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ""}`}>
                        {isSelected && <Check size={14} />}
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredOptions.length === 0 && !showCustomOption && (
                <div className={styles.noResults}>No exercises found</div>
              )}
            </div>
          </div>
        </>
      )}

      {!isAddingExercise && multiSelect && (
        <div className={styles.footer}>
          <Button
            onClick={handleConfirmMultiSelect}
            disabled={selectedExercises.length === 0}
          >
            {selectedExercises.length === 0
              ? "Add exercises"
              : `Add ${selectedExercises.length} exercise${selectedExercises.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </SwipeableDrawer>
  );
};
