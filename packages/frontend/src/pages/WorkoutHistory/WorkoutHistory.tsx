import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Dumbbell, Zap } from 'lucide-react'
import { apiFetch } from '../../utils/api'
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

const WorkoutHistory = () => {
  const navigate = useNavigate()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const handleWorkoutClick = (workout: Workout) => {
    if (workout.type === 'program' && workout.programId) {
      navigate(`/programs/${workout.programId}`)
    }
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
                    disabled={workout.type === 'quick'}
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
    </div>
  )
}

export default WorkoutHistory
