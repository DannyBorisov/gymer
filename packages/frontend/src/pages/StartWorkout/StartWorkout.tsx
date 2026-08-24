import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronRight, Loader2, Settings2 } from 'lucide-react'
import { useSettings } from '../../contexts/SettingsContext'
import { type Week } from '../../contexts/WorkoutContext'
import { WeeksList } from '../../components/WeeksList/WeeksList'
import { apiFetch } from '../../utils/api'
import styles from './StartWorkout.module.css'

const StartWorkout = () => {
  const navigate = useNavigate()
  const { activeProgram } = useSettings()

  const [weeks, setWeeks] = useState<Week[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch active program details
  useEffect(() => {
    if (!activeProgram) {
      setIsLoading(false)
      return
    }

    const fetchProgram = async () => {
      try {
        const response = await apiFetch(`/api/programs/${activeProgram.id}`)
        const data = await response.json()
        if (response.ok) {
          setWeeks(data.program)
        } else {
          setError(data.error || "Failed to fetch program")
        }
      } catch {
        setError("Network error")
      } finally {
        setIsLoading(false)
      }
    }
    fetchProgram()
  }, [activeProgram])

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Start Workout</h1>

      {/* Quick Workout - simple card */}
      <button
        className={styles.quickWorkoutCard}
        onClick={() => navigate('/quick-workout')}
      >
        <div className={styles.quickWorkoutContent}>
          <span className={styles.quickWorkoutTitle}>Empty Workout</span>
          <span className={styles.quickWorkoutSubtitle}>Start from scratch</span>
        </div>
        <ChevronRight size={18} className={styles.chevron} />
      </button>

      {/* Active Program Section */}
      <div className={styles.programsSection}>
        {activeProgram ? (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{activeProgram.name}</h2>
              <Link to="/programs" className={styles.changeBtn}>
                <Settings2 size={16} />
                <span>Change</span>
              </Link>
            </div>

            {isLoading ? (
              <div className={styles.loadingState}>
                <Loader2 size={20} className={styles.spinner} />
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <p>{error}</p>
              </div>
            ) : (
              <WeeksList
                programId={activeProgram.id}
                programName={activeProgram.name}
                weeks={weeks}
              />
            )}
          </>
        ) : (
          <div className={styles.noProgram}>
            <p className={styles.noProgramText}>No active program selected</p>
            <Link to="/programs" className={styles.selectProgramBtn}>
              Select a program
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default StartWorkout
