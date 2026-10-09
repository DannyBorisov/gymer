import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Trash2, Loader2 } from "lucide-react";
import { SwipeableDrawer } from "../SwipeableDrawer";
import { useGetWorkoutHistory, Workout } from "../../api/workouts";
import {
  useGetCalendarNotes,
  useSaveCalendarNote,
  useDeleteCalendarNote,
  CalendarNote,
} from "../../api/calendar";
import { parseDate } from "../../lib/date";
import { hapticSelection } from "../../utils/haptics";
import styles from "./WorkoutCalendar.module.css";

interface WorkoutCalendarProps {
  isOpen: boolean;
  onClose: () => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WorkoutCalendar = ({ isOpen, onClose }: WorkoutCalendarProps) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const { data: workoutData } = useGetWorkoutHistory();
  const { data: notesData, isLoading: isLoadingNotes } = useGetCalendarNotes(
    currentYear,
    currentMonth + 1
  );
  const saveNote = useSaveCalendarNote();
  const deleteNote = useDeleteCalendarNote();

  // Build a map of dates with workouts
  const workoutDates = useMemo(() => {
    const map = new Map<string, Workout[]>();
    if (!workoutData?.workouts) return map;

    for (const workout of workoutData.workouts) {
      if (!workout.date) continue;
      const date = parseDate(workout.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const existing = map.get(key) || [];
      existing.push(workout);
      map.set(key, existing);
    }
    return map;
  }, [workoutData]);

  // Build a map of dates with notes
  const notesMap = useMemo(() => {
    const map = new Map<string, CalendarNote>();
    if (!notesData?.notes) return map;
    for (const note of notesData.notes) {
      map.set(note.date, note);
    }
    return map;
  }, [notesData]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    // Padding for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [currentYear, currentMonth]);

  const goToPrevMonth = () => {
    hapticSelection();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    hapticSelection();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayClick = (day: number) => {
    hapticSelection();
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    const existingNote = notesMap.get(dateStr);
    setNoteInput(existingNote?.note || "");
  };

  const handleSaveNote = () => {
    if (!selectedDate || !noteInput.trim()) return;
    saveNote.mutate(
      { date: selectedDate, note: noteInput.trim() },
      { onSuccess: () => setSelectedDate(null) }
    );
  };

  const handleDeleteNote = () => {
    if (!selectedDate) return;
    deleteNote.mutate(selectedDate, {
      onSuccess: () => {
        setNoteInput("");
        setSelectedDate(null);
      },
    });
  };

  const formatSelectedDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const selectedWorkouts = selectedDate ? workoutDates.get(selectedDate) : null;
  const selectedNote = selectedDate ? notesMap.get(selectedDate) : null;

  return (
    <SwipeableDrawer isOpen={isOpen} onClose={onClose} maxHeight="85vh">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Workout Calendar</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Month Navigation */}
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={goToPrevMonth}>
            <ChevronLeft size={20} />
          </button>
          <span className={styles.monthLabel}>
            {MONTHS[currentMonth]} {currentYear}
          </span>
          <button className={styles.navBtn} onClick={goToNextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className={styles.weekdays}>
          {WEEKDAYS.map((day) => (
            <span key={day} className={styles.weekday}>
              {day}
            </span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className={styles.grid}>
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className={styles.emptyDay} />;
            }

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasWorkout = workoutDates.has(dateStr);
            const hasNote = notesMap.has(dateStr);
            const isToday =
              day === today.getDate() &&
              currentMonth === today.getMonth() &&
              currentYear === today.getFullYear();
            const isSelected = dateStr === selectedDate;

            return (
              <button
                key={dateStr}
                className={`${styles.day} ${isToday ? styles.today : ""} ${isSelected ? styles.selected : ""}`}
                onClick={() => handleDayClick(day)}
              >
                <span className={styles.dayNumber}>{day}</span>
                <div className={styles.indicators}>
                  {hasWorkout && <span className={styles.workoutDot} />}
                  {hasNote && <span className={styles.noteDot} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.workoutDot}`} />
            <span>Workout</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.noteDot}`} />
            <span>Note</span>
          </div>
        </div>

        {/* Selected Day Detail */}
        {selectedDate && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <span className={styles.detailDate}>
                {formatSelectedDate(selectedDate)}
              </span>
              <button
                className={styles.detailClose}
                onClick={() => setSelectedDate(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Workouts on this day */}
            {selectedWorkouts && selectedWorkouts.length > 0 && (
              <div className={styles.workoutList}>
                {selectedWorkouts.map((w, i) => (
                  <div key={i} className={styles.workoutItem}>
                    <span className={styles.workoutName}>{w.name}</span>
                    {w.duration && (
                      <span className={styles.workoutDuration}>{w.duration}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Note Input */}
            <div className={styles.noteSection}>
              <textarea
                className={styles.noteInput}
                placeholder="Add a note for this day..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                rows={3}
              />
              <div className={styles.noteActions}>
                {selectedNote && (
                  <button
                    className={styles.deleteNoteBtn}
                    onClick={handleDeleteNote}
                    disabled={deleteNote.isPending}
                  >
                    {deleteNote.isPending ? (
                      <Loader2 size={16} className={styles.spinner} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                )}
                <button
                  className={styles.saveNoteBtn}
                  onClick={handleSaveNote}
                  disabled={!noteInput.trim() || saveNote.isPending}
                >
                  {saveNote.isPending ? (
                    <Loader2 size={16} className={styles.spinner} />
                  ) : (
                    "Save Note"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoadingNotes && (
          <div className={styles.loading}>
            <Loader2 size={20} className={styles.spinner} />
          </div>
        )}
      </div>
    </SwipeableDrawer>
  );
};
