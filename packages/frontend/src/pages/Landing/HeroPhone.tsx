// avoid-ai-design-ignore: SD8 - green is the app's semantic color for progress/gains
import styles from "./HeroPhone.module.css";

const HeroPhone = () => {
  return (
    <div className={styles.scene}>
      {/* Main phone with analytics screenshot */}
      <div className={styles.phone}>
        <div className={styles.phoneFrame}>
          <div className={styles.notch} />
          <img
            src="/landing/analytics.png"
            alt="Analytics screen"
            className={styles.screenshot}
          />
        </div>
      </div>

      {/* Floating card: Chart breakout */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <span className={styles.exerciseName}>Barbell Bench Press</span>
          <span className={styles.gain}>+89.4%</span>
        </div>
        <div className={styles.chartMeta}>
          <span>Best: 158.3 kg e1RM</span>
          <span>3d ago</span>
        </div>
        <div className={styles.chart}>
          <svg viewBox="0 0 200 60" className={styles.chartSvg}>
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            <path
              d="M0,50 L20,48 L40,47 L60,45 L80,44 L100,42 L120,35 L140,30 L160,20 L180,12 L200,8 L200,60 L0,60 Z"
              fill="url(#areaGradient)"
            />
            {/* Line */}
            <path
              d="M0,50 L20,48 L40,47 L60,45 L80,44 L100,42 L120,35 L140,30 L160,20 L180,12 L200,8"
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={styles.chartLine}
            />
            {/* End dot */}
            <circle cx="200" cy="8" r="5" fill="#10b981" className={styles.chartDot} />
          </svg>
          <div className={styles.chartLabels}>
            <span>22/09</span>
            <span>27/09</span>
            <span>28/09</span>
          </div>
        </div>
      </div>

      {/* Floating badge: PR */}
      <div className={styles.prBadge}>
        <div className={styles.prIcon}>PR</div>
        <div className={styles.prInfo}>
          <span className={styles.prValue}>158.3 kg</span>
          <span className={styles.prLabel}>New Record</span>
        </div>
      </div>

      {/* Floating card: Current set */}
      <div className={styles.setCard}>
        <div className={styles.setHeader}>Front Squat</div>
        <div className={styles.setValues}>
          <div className={styles.setValue}>
            <span className={styles.setNum}>100</span>
            <span className={styles.setUnit}>kg</span>
          </div>
          <span className={styles.setX}>×</span>
          <div className={styles.setValue}>
            <span className={styles.setNum}>8</span>
            <span className={styles.setUnit}>reps</span>
          </div>
        </div>
        <div className={styles.setProgress}>
          <div className={styles.setDot + " " + styles.done} />
          <div className={styles.setDot + " " + styles.done} />
          <div className={styles.setDot + " " + styles.active} />
          <div className={styles.setDot} />
        </div>
      </div>

      {/* Floating: Streak */}
      <div className={styles.streakBadge}>
        <span className={styles.streakFire}>🔥</span>
        <span className={styles.streakNum}>6</span>
        <span className={styles.streakText}>day streak</span>
      </div>
    </div>
  );
};

export default HeroPhone;
