import { useState, useEffect, useCallback } from 'react'
import { Check, Loader2, Bell, BellOff } from 'lucide-react'
import { apiFetch } from '../../utils/api'
import { useSettings } from '../../contexts/SettingsContext'
import { scheduleWeightReminder, cancelWeightReminder, getWeightReminderTime, setWeightReminderTime } from '../../utils/notifications'
import styles from './Weight.module.css'

interface WeightEntry {
  date: string
  weight: string
}

const Weight = () => {
  const { weightUnit } = useSettings()
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [weightInput, setWeightInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(() => {
    return localStorage.getItem('weightReminderEnabled') === 'true'
  })
  const [reminderTime, setReminderTime] = useState(() => getWeightReminderTime())

  const fetchEntries = useCallback(async () => {
    try {
      const response = await apiFetch('/api/body-weight')
      const data = await response.json()
      if (response.ok && data.entries) {
        setEntries(data.entries)
      }
    } catch (err) {
      console.error('Weight fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Schedule/cancel reminder when toggle changes
  useEffect(() => {
    if (reminderEnabled) {
      scheduleWeightReminder()
    } else {
      cancelWeightReminder()
    }
  }, [reminderEnabled])

  const toggleReminder = async () => {
    const newValue = !reminderEnabled
    setReminderEnabled(newValue)
    localStorage.setItem('weightReminderEnabled', String(newValue))
  }

  const handleSave = async () => {
    if (!weightInput.trim()) return

    setIsSaving(true)
    try {
      const response = await apiFetch('/api/body-weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: weightInput }),
      })

      if (response.ok) {
        const data = await response.json()
        setEntries((prev) => [
          { date: data.date, weight: data.weight },
          ...prev,
        ])
        setWeightInput('')
      }
    } catch (err) {
      console.error('Weight save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const getTodayStr = () => {
    const today = new Date()
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
  }

  const formatDisplayDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/')
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === getTodayStr()) {
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

  const todayStr = getTodayStr()
  const hasLoggedToday = entries[0]?.date === todayStr

  const formatTimeFor24h = () => {
    return `${String(reminderTime.hour).padStart(2, '0')}:${String(reminderTime.minute).padStart(2, '0')}`
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hourStr, minuteStr] = e.target.value.split(':')
    const hour = parseInt(hourStr, 10)
    const minute = parseInt(minuteStr, 10)
    setReminderTime({ hour, minute })
    setWeightReminderTime(hour, minute)
    if (reminderEnabled) {
      scheduleWeightReminder()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Body Weight</h1>
        <div className={styles.reminderControls}>
          {reminderEnabled && (
            <input
              type="time"
              value={formatTimeFor24h()}
              onChange={handleTimeChange}
              className={styles.timeInput}
            />
          )}
          <button
            onClick={toggleReminder}
            className={`${styles.reminderBtn} ${reminderEnabled ? styles.reminderBtnActive : ''}`}
            title={reminderEnabled ? 'Disable reminder' : 'Enable daily reminder'}
          >
            {reminderEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
        </div>
      </div>

      {/* Log weight input */}
      <div className={styles.logCard}>
        {hasLoggedToday ? (
          <div className={styles.loggedToday}>
            <Check size={20} />
            <span>Logged today: {entries[0].weight} {weightUnit}</span>
          </div>
        ) : (
          <>
            <span className={styles.logLabel}>Log today's weight</span>
            <div className={styles.inputRow}>
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder={weightUnit}
                className={styles.input}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={!weightInput.trim() || isSaving}
                className={styles.saveBtn}
              >
                {isSaving ? (
                  <Loader2 size={20} className={styles.spinner} />
                ) : (
                  <Check size={20} />
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* History */}
      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>History</h2>

        {isLoading ? (
          <div className={styles.loadingState}>
            <Loader2 size={20} className={styles.spinner} />
            <span>Loading...</span>
          </div>
        ) : entries.length === 0 ? (
          <p className={styles.emptyState}>No entries yet</p>
        ) : (
          <div className={styles.historyList}>
            {entries.map((entry, idx) => (
              <div key={`${entry.date}-${idx}`} className={styles.historyItem}>
                <span className={styles.historyDate}>
                  {formatDisplayDate(entry.date)}
                </span>
                <span className={styles.historyWeight}>
                  {entry.weight} {weightUnit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Weight
