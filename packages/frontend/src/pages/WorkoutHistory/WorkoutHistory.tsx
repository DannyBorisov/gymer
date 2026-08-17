import styles from './WorkoutHistory.module.css'

const WorkoutHistory = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Workout History</h1>
      <p className={styles.subtitle}>View your past workouts</p>

      <div className={styles.emptyState}>
        <p>No workouts recorded yet.</p>
        <p>Start tracking your workouts to see them here.</p>
      </div>
    </div>
  )
}

export default WorkoutHistory
