import { Link } from 'react-router-dom'
import styles from './Programs.module.css'

const Programs = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Programs</h1>
          <p className={styles.subtitle}>Manage your workout programs</p>
        </div>
        <Link to="/programs/create" className={styles.createButton}>
          Create Program
        </Link>
      </div>

      <div className={styles.emptyState}>
        <p>No programs created yet.</p>
        <p>Create your first program to get started.</p>
      </div>
    </div>
  )
}

export default Programs
