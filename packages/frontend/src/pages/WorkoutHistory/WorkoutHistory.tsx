import { useState, useEffect } from 'react'
import { Loader2, Dumbbell, Zap, Clock } from 'lucide-react'
import { apiFetch } from '../../utils/api'
import { useSettings } from '../../contexts/SettingsContext'
import { SwipeableDrawer } from '../../components/SwipeableDrawer'
import styles from './WorkoutHistory.module.css'

interface Workout {
  id: string
  date: string
  name: string
  type: 'quick' | 'program'
  duration?: string
  exerciseCount: number
  programId?: string
  programName?: string
}

interface WorkoutSet {
  exercise: string
  set: number
  weight: string
  reps: string
  rir: string
  notes: string
}

interface WorkoutDetail {
  date: string
  duration: string
  exercises: {
    name: string
    sets: WorkoutSet[]
  }[]
}

const WorkoutHistory = () => {
  const { weightUnit } = useSettings()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [workoutDetail, setWorkoutDetail] = useState<WorkoutDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        const response = await apiFetch('/api/workouts/history')
        const data = await response.json()
        if (response.ok && data.workouts) {
          setWorkouts(data.workouts)
        }
      } catch (err) {
        console.error('Failed to fetch workouts:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchWorkouts()
  }, [])

  const formatDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/')
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDuration = (duration: string) => {
    // Handle H:MM:SS or HH:MM:SS format
    if (duration.includes(':')) {
      const parts = duration.split(':')
      if (parts.length === 3) {
        const hours = parseInt(parts[0], 10)
        const mins = parseInt(parts[1], 10)
        if (hours > 0) {
          return `${hours}h ${mins}m`
        }
        return `${mins} min`
      }
    }
    // Handle seconds as number
    const seconds = parseInt(duration, 10)
    if (isNaN(seconds)) return duration
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  const handleWorkoutClick = async (workout: Workout) => {
    setSelectedWorkout(workout)
    setWorkoutDetail(null)
    setIsDetailLoading(true)

    try {
      let url = `/api/workouts/${encodeURIComponent(workout.id)}?type=${workout.type}`

      if (workout.type === 'program' && workout.programId) {
        // Parse the workout id to get week and workout name
        // ID format: programId|date|week|workoutName
        const parts = workout.id.split('|')
        const date = parts[1]
        const week = parts[2]
        const workoutName = parts[3]
        url += `&programId=${workout.programId}&date=${encodeURIComponent(date)}&week=${encodeURIComponent(week)}&workout=${encodeURIComponent(workoutName)}`
      }

      const response = await apiFetch(url)
      const data = await response.json()

      if (response.ok) {
        setWorkoutDetail(data)
      }
    } catch (err) {
      console.error('Failed to fetch workout details:', err)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedWorkout(null)
    setWorkoutDetail(null)
  }

  // Group workouts by date
  const groupedWorkouts = workouts.reduce((acc, workout) => {
    const dateKey = workout.date
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(workout)
    return acc
  }, {} as Record<string, Workout[]>)

  const sortedDates = Object.keys(groupedWorkouts).sort((a, b) => {
    const parseDate = (d: string) => {
      const [day, month, year] = d.split('/')
      return new Date(Number(year), Number(month) - 1, Number(day)).getTime()
    }
    return parseDate(b) - parseDate(a)
  })

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Workouts</h1>
      <p className={styles.subtitle}>Your workout history</p>

      {isLoading ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading workouts...</span>
        </div>
      ) : workouts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No workouts recorded yet.</p>
          <p>Start a workout to see it here.</p>
        </div>
      ) : (
        <div className={styles.workoutList}>
          {sortedDates.map((date) => (
            <div key={date} className={styles.dateGroup}>
              <h2 className={styles.dateHeader}>{formatDate(date)}</h2>
              <div className={styles.workoutCards}>
                {groupedWorkouts[date].map((workout) => (
                  <button
                    key={workout.id}
                    className={styles.workoutCard}
                    onClick={() => handleWorkoutClick(workout)}
                  >
                    <div className={styles.workoutIcon}>
                      {workout.type === 'quick' ? (
                        <Zap size={20} />
                      ) : (
                        <Dumbbell size={20} />
                      )}
                    </div>
                    <div className={styles.workoutInfo}>
                      <span className={styles.workoutName}>{workout.name}</span>
                      {workout.type === 'program' && workout.programName && (
                        <span className={styles.programName}>{workout.programName}</span>
                      )}
                      <span className={styles.workoutMeta}>
                        {workout.exerciseCount} exercise{workout.exerciseCount !== 1 ? 's' : ''}
                        {workout.duration && ` · ${formatDuration(workout.duration)}`}
                      </span>
                    </div>
                    <div className={`${styles.workoutBadge} ${workout.type === 'quick' ? styles.quickBadge : styles.programBadge}`}>
                      {workout.type === 'quick' ? 'Quick' : 'Program'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workout Detail Drawer */}
      <SwipeableDrawer isOpen={!!selectedWorkout} onClose={closeDetail} maxHeight="85vh">
        {selectedWorkout && (
          <>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerHeaderInfo}>
                <h2 className={styles.drawerTitle}>{selectedWorkout.name}</h2>
                <div className={styles.drawerMeta}>
                  <span>{formatDate(selectedWorkout.date)}</span>
                  {workoutDetail?.duration && (
                    <>
                      <span className={styles.metaDot}>·</span>
                      <Clock size={14} />
                      <span>{formatDuration(workoutDetail.duration)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.drawerContent}>
              {isDetailLoading ? (
                <div className={styles.loadingState}>
                  <Loader2 size={20} className={styles.spinner} />
                  <span>Loading...</span>
                </div>
              ) : workoutDetail ? (
                <div className={styles.exerciseList}>
                  {workoutDetail.exercises.map((exercise) => (
                    <div key={exercise.name} className={styles.exerciseCard}>
                      <h3 className={styles.exerciseName}>{exercise.name}</h3>
                      <div className={styles.setsList}>
                        {exercise.sets.map((set, idx) => (
                          <div key={idx} className={styles.setRow}>
                            <span className={styles.setNumber}>{set.set}</span>
                            <div className={styles.setDetails}>
                              <span className={styles.setData}>
                                {set.weight}{weightUnit} × {set.reps}
                                {set.rir && <span className={styles.setRir}> @ {set.rir} RIR</span>}
                              </span>
                              {set.notes && <span className={styles.setNotes}>{set.notes}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p>Could not load workout details</p>
                </div>
              )}
            </div>
          </>
        )}
      </SwipeableDrawer>
    </div>
  )
}

export default WorkoutHistory
