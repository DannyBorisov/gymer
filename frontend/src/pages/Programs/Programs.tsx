import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Loader2, Plus } from 'lucide-react'
import { apiFetch } from '../../utils/api'
import styles from './Programs.module.css'

interface Program {
  id: string
  name: string
  createdTime: string
  url: string
}

const Programs = () => {
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await apiFetch('/api/programs')
        const data = await response.json()

        if (response.ok) {
          setPrograms(data.programs)
        } else {
          setError(data.error || 'Failed to fetch programs')
        }
      } catch {
        setError('Network error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrograms()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Programs</h1>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading programs...</span>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error}</p>
        </div>
      ) : (
        <div className={styles.programsList}>
          {programs.map((program) => (
            <Link
              key={program.id}
              to={`/programs/${program.id}`}
              className={styles.programCard}
            >
              <div className={styles.programInfo}>
                <span className={styles.programName}>{program.name}</span>
                <span className={styles.programDate}>
                  Created {formatDate(program.createdTime)}
                </span>
              </div>
              <ChevronRight size={16} className={styles.chevronIcon} />
            </Link>
          ))}
          <Link to="/programs/create" className={styles.createCard}>
            <Plus size={20} />
            <span>Create Program</span>
          </Link>
        </div>
      )}
    </div>
  )
}

export default Programs
