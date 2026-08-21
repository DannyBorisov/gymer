import { useState } from 'react'
import { LogOut, Timer, Bell } from 'lucide-react'

const BodyScaleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 9v3" />
    <circle cx="12" cy="12" r="0.5" fill="currentColor" />
  </svg>
)
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { getSoundMode, setSoundMode, previewSoundMode, type SoundMode } from '../../utils/sound'
import {
  isWeightReminderEnabled,
  setWeightReminderEnabled,
  getWeightReminderTime,
  setWeightReminderTime,
  scheduleWeightReminder,
  cancelWeightReminder,
} from '../../utils/notifications'
import styles from './Profile.module.css'

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const Profile = () => {
  const { user, logout } = useAuth()
  const { weightUnit, setWeightUnit, showRestSuggestion, setShowRestSuggestion, restTimerDuration, setRestTimerDuration } = useSettings()
  const navigate = useNavigate()
  const [soundMode, setSoundModeState] = useState<SoundMode>(getSoundMode)

  // Weight reminder state
  const [weightReminderOn, setWeightReminderOn] = useState(isWeightReminderEnabled)
  const [reminderTime, setReminderTime] = useState(() => {
    const { hour, minute } = getWeightReminderTime()
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  })

  const handleSoundModeChange = (mode: SoundMode) => {
    setSoundModeState(mode)
    setSoundMode(mode)
    previewSoundMode(mode)
  }

  const handleWeightReminderToggle = async () => {
    const newValue = !weightReminderOn
    setWeightReminderOn(newValue)
    setWeightReminderEnabled(newValue)

    if (newValue) {
      await scheduleWeightReminder()
    } else {
      await cancelWeightReminder()
    }
  }

  const handleReminderTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value
    setReminderTime(time)

    const [hour, minute] = time.split(':').map(Number)
    setWeightReminderTime(hour, minute)

    if (weightReminderOn) {
      await scheduleWeightReminder()
    }
  }

  if (!user) return null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
        <button
          className={styles.weightBtn}
          onClick={() => navigate('/weight')}
          aria-label="Weight tracking"
        >
          <BodyScaleIcon size={20} />
        </button>
      </div>

      {/* User info card */}
      <div className={styles.userCard}>
        <div className={styles.avatar}>
          {getInitials(user.name)}
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userEmail}>{user.email}</span>
        </div>
      </div>

      {/* Settings section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Settings</h2>

        <div className={styles.settingsCard}>
          <div className={styles.settingsRow}>
            <div className={styles.settingsLabel}>
              <BodyScaleIcon size={18} />
              <span>Weight unit</span>
            </div>
            <div className={styles.unitToggle}>
              <button
                className={`${styles.unitBtn} ${weightUnit === 'kg' ? styles.unitBtnActive : ''}`}
                onClick={() => setWeightUnit('kg')}
              >
                kg
              </button>
              <button
                className={`${styles.unitBtn} ${weightUnit === 'lbs' ? styles.unitBtnActive : ''}`}
                onClick={() => setWeightUnit('lbs')}
              >
                lbs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>

        <div className={styles.settingsCard}>
          {/* Weight Reminder */}
          <div className={styles.settingsRow}>
            <div className={styles.settingsLabel}>
              <Bell size={18} />
              <span>Daily weight reminder</span>
            </div>
            <div className={styles.reminderControls}>
              {weightReminderOn && (
                <input
                  type="time"
                  value={reminderTime}
                  onChange={handleReminderTimeChange}
                  className={styles.timeInput}
                />
              )}
              <button
                className={`${styles.toggleBtn} ${weightReminderOn ? styles.toggleBtnActive : ''}`}
                onClick={handleWeightReminderToggle}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          </div>

          {/* Rest Timer */}
          <div className={styles.settingsRow}>
            <div className={styles.settingsLabel}>
              <Timer size={18} />
              <span>Rest timer</span>
            </div>
            <div className={styles.restTimerControls}>
              {showRestSuggestion && (
                <>
                  <div className={styles.durationInput}>
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={restTimerDuration}
                      onChange={(e) => setRestTimerDuration(Number(e.target.value) || 60)}
                      className={styles.numberInput}
                    />
                    <span className={styles.durationUnit}>sec</span>
                  </div>
                  <div className={styles.alertToggle}>
                    <button
                      className={`${styles.alertBtn} ${soundMode === 'beep' ? styles.alertBtnActive : ''}`}
                      onClick={() => handleSoundModeChange('beep')}
                    >
                      Beep
                    </button>
                    <button
                      className={`${styles.alertBtn} ${soundMode === 'voice' ? styles.alertBtnActive : ''}`}
                      onClick={() => handleSoundModeChange('voice')}
                    >
                      Voice
                    </button>
                  </div>
                </>
              )}
              <button
                className={`${styles.toggleBtn} ${showRestSuggestion ? styles.toggleBtnActive : ''}`}
                onClick={() => setShowRestSuggestion(!showRestSuggestion)}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <button className={styles.signOutButton} onClick={logout}>
        <LogOut size={18} />
        <span>Sign out</span>
      </button>
    </div>
  )
}

export default Profile
