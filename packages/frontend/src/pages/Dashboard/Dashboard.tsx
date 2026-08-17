import styles from './Dashboard.module.css'

const Dashboard = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome to Gymerr</h1>
      <p className={styles.subtitle}>Track your workouts and build your programs</p>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>0</div>
          <div className={styles.statLabel}>Workouts This Week</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>0</div>
          <div className={styles.statLabel}>Total Programs</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>0</div>
          <div className={styles.statLabel}>Total Workouts</div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
