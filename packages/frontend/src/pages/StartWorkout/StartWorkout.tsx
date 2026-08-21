import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Dumbbell, ChevronRight, Loader2 } from 'lucide-react'
import { apiFetch } from '../../utils/api'
import styles from './StartWorkout.module.css'

interface Program {
  id: string
  name: string
  createdTime: string
  url: string
}

const StartWorkout = () => {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await apiFetch('/api/programs')
        const data = await response.json()
        if (response.ok && data.programs) {
          setPrograms(data.programs)
        }
      } catch (err) {
        console.error('Programs fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPrograms()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Start Workout</h1>

      {/* Quick Workout Option */}
      <button
        className={styles.quickWorkoutCard}
        onClick={() => navigate('/quick-workout')}
      >
        <div className={styles.quickWorkoutIcon}>
          <Zap size={28} />
        </div>
        <div className={styles.quickWorkoutContent}>
          <span className={styles.quickWorkoutTitle}>Quick Workout</span>
          <span className={styles.quickWorkoutSubtitle}>Add exercises on the fly</span>
        </div>
        <ChevronRight size={20} className={styles.chevron} />
      </button>

      {/* Programs Section */}
      <div className={styles.programsSection}>
        <h2 className={styles.sectionTitle}>From Program</h2>

        {isLoading ? (
          <div className={styles.loadingState}>
            <Loader2 size={20} className={styles.spinner} />
          </div>
        ) : programs.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No programs yet</p>
            <button
              className={styles.createBtn}
              onClick={() => navigate('/programs/create')}
            >
              Create your first program
            </button>
          </div>
        ) : (
          <div className={styles.programsList}>
            {programs.map((program) => (
              <button
                key={program.id}
                className={styles.programCard}
                onClick={() => navigate(`/programs/${program.id}`)}
              >
                <div className={styles.programIcon}>
                  <Dumbbell size={20} />
                </div>
                <div className={styles.programContent}>
                  <span className={styles.programName}>{program.name}</span>
                  <span className={styles.programMeta}>
                    Created {formatDate(program.createdTime)}
                  </span>
                </div>
                <ChevronRight size={18} className={styles.chevron} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StartWorkout
