import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Plus,
  X,
  Check,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useQuickWorkout } from "../../contexts/QuickWorkoutContext";
import { useSettings } from "../../contexts/SettingsContext";
import styles from "./QuickWorkout.module.css";

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const QuickWorkout = () => {
  const navigate = useNavigate();
  const { weightUnit } = useSettings();
  const {
    isActive,
    exercises,
    sets,
    timer,
    isSaving,
    availableExercises,
    isLoadingExercises,
    startWorkout,
    addExercise,
    renameExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    completeWorkout,
    discardWorkout,
    loadExercises,
    hasRecoveryData,
    recoverWorkout,
    dismissRecovery,
  } = useQuickWorkout();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check for recovery data on mount
  useEffect(() => {
    if (!isActive && hasRecoveryData()) {
      setShowRecovery(true);
    }
  }, [isActive, hasRecoveryData]);

  // Load exercises on mount
  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Start workout automatically when page loads (if not recovering)
  useEffect(() => {
    if (!isActive && !showRecovery) {
      startWorkout();
    }
  }, [isActive, showRecovery, startWorkout]);

  // Focus search input when drawer opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Filter exercises based on search
  const filteredExercises = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return availableExercises;
    return availableExercises.filter((ex) =>
      ex.toLowerCase().includes(query)
    );
  }, [availableExercises, searchQuery]);

  const openExerciseSelector = (exerciseName: string | null) => {
    setEditingExercise(exerciseName);
    setSearchQuery("");
    setShowSearch(true);
  };

  const handleSelectExercise = (name: string) => {
    if (editingExercise === null) {
      // Adding new exercise
      addExercise(name);
    } else if (editingExercise === "") {
      // New card with empty name - just add the exercise
      addExercise(name);
    } else {
      // Renaming existing exercise
      renameExercise(editingExercise, name);
    }
    setShowSearch(false);
    setSearchQuery("");
    setEditingExercise(null);
  };

  const handleAddNewExercise = () => {
    const name = searchQuery.trim();
    if (name) {
      handleSelectExercise(name);
    }
  };

  const handleComplete = async () => {
    const success = await completeWorkout();
    if (success) {
      navigate("/programs");
    }
  };

  const handleDiscard = () => {
    discardWorkout();
    navigate("/programs");
  };

  const handleRecover = () => {
    recoverWorkout();
    setShowRecovery(false);
  };

  const handleDismissRecovery = () => {
    dismissRecovery();
    setShowRecovery(false);
    startWorkout();
  };

  // Recovery prompt
  if (showRecovery) {
    return (
      <div className={styles.container}>
        <Link to="/programs" className={styles.backLink}>
          <ChevronLeft size={16} />
          Back to Programs
        </Link>
        <div className={styles.recoveryBanner}>
          <span className={styles.recoveryText}>
            You have an unfinished quick workout. Would you like to continue?
          </span>
          <div className={styles.recoveryActions}>
            <button onClick={handleRecover} className={styles.recoverBtn}>
              Continue Workout
            </button>
            <button onClick={handleDismissRecovery} className={styles.dismissBtn}>
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get valid sets count (sets with exercise name and at least weight or reps)
  const validSetsCount = sets.filter((s) => s.exercise && (s.weight || s.reps)).length;

  return (
    <div className={styles.workoutContainer}>
      {/* Header with timer */}
      <div className={styles.header}>
        <div className={styles.timerSection}>
          <span className={styles.timer}>{formatTime(timer)}</span>
        </div>
      </div>

      {/* Exercise list */}
      <div className={styles.exerciseList}>
        {exercises.map((exerciseName) => {
          const exerciseSets = sets.filter((s) => s.exercise === exerciseName);
          return (
            <div key={exerciseName} className={styles.exerciseCard}>
              <div className={styles.exerciseCardHeader}>
                <button
                  onClick={() => openExerciseSelector(exerciseName)}
                  className={styles.exerciseNameBtn}
                >
                  <span className={styles.exerciseName}>{exerciseName}</span>
                  <ChevronDown size={16} />
                </button>
                <button
                  onClick={() => removeExercise(exerciseName)}
                  className={styles.removeExerciseBtn}
                >
                  <X size={18} />
                </button>
              </div>

              <div className={styles.setsList}>
                {exerciseSets.map((set) => (
                  <div key={set.id} className={styles.setRow}>
                    <span className={styles.setNumber}>{set.set}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={set.weight}
                      onChange={(e) =>
                        updateSet(set.id, "weight", e.target.value)
                      }
                      placeholder={weightUnit}
                      className={styles.setInput}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={set.reps}
                      onChange={(e) =>
                        updateSet(set.id, "reps", e.target.value)
                      }
                      placeholder="Reps"
                      className={styles.setInput}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={set.rir}
                      onChange={(e) =>
                        updateSet(set.id, "rir", e.target.value)
                      }
                      placeholder="RIR"
                      className={styles.setInput}
                    />
                    {exerciseSets.length > 1 && (
                      <button
                        onClick={() => removeSet(set.id)}
                        className={styles.removeSetBtn}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={() => addSet(exerciseName)}
                  className={styles.addSetBtn}
                >
                  <Plus size={16} />
                  Add Set
                </button>
              </div>
            </div>
          );
        })}

        {/* Add exercise button */}
        <button
          onClick={() => openExerciseSelector(null)}
          className={styles.addExerciseCard}
        >
          <Plus size={20} />
          <span>Add Exercise</span>
        </button>
      </div>

      {/* Bottom actions */}
      {exercises.length > 0 && (
        <div className={styles.bottomActions}>
          <button
            onClick={handleComplete}
            disabled={validSetsCount === 0 || isSaving}
            className={styles.completeBtn}
          >
            {isSaving ? (
              <>
                <Loader2 size={20} className={styles.spinner} />
                Saving...
              </>
            ) : (
              <>
                <Check size={20} />
                Complete Workout
              </>
            )}
          </button>
          <button onClick={handleDiscard} className={styles.discardBtn}>
            Discard workout
          </button>
        </div>
      )}

      {/* Discard button when no exercises */}
      {exercises.length === 0 && (
        <div className={styles.bottomActionsEmpty}>
          <button onClick={handleDiscard} className={styles.discardBtnEmpty}>
            Cancel
          </button>
        </div>
      )}

      {/* Exercise search drawer */}
      {showSearch && (
        <div
          className={styles.searchOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSearch(false);
              setSearchQuery("");
              setEditingExercise(null);
            }
          }}
        >
          <div className={styles.searchModal}>
            <div className={styles.searchHeader}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or add exercise..."
                className={styles.searchInput}
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                  setEditingExercise(null);
                }}
                className={styles.closeSearchBtn}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.searchResults}>
              {isLoadingExercises ? (
                <div className={styles.loadingState}>
                  <Loader2 size={20} className={styles.spinner} />
                  <span>Loading exercises...</span>
                </div>
              ) : (
                <>
                  {/* Add custom exercise option */}
                  {searchQuery.trim() &&
                    !availableExercises.some(
                      (ex) => ex.toLowerCase() === searchQuery.trim().toLowerCase()
                    ) && (
                      <button
                        onClick={handleAddNewExercise}
                        className={styles.addNewExercise}
                      >
                        <Plus size={18} />
                        Add "{searchQuery.trim()}"
                      </button>
                    )}

                  {/* Search results */}
                  {filteredExercises.map((ex) => {
                    const isCurrentExercise = ex === editingExercise;
                    const isAlreadyAdded = exercises.includes(ex) && !isCurrentExercise;
                    return (
                      <button
                        key={ex}
                        onClick={() => !isAlreadyAdded && handleSelectExercise(ex)}
                        className={`${styles.searchResultItem} ${isAlreadyAdded ? styles.searchResultItemDisabled : ""} ${isCurrentExercise ? styles.searchResultItemCurrent : ""}`}
                        disabled={isAlreadyAdded}
                      >
                        {ex}
                        {isAlreadyAdded && <Check size={16} />}
                      </button>
                    );
                  })}

                  {filteredExercises.length === 0 && !searchQuery.trim() && (
                    <p className={styles.emptyHint}>
                      Start typing to search or add a new exercise
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickWorkout;
