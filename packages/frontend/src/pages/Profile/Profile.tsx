import { useState, useMemo } from "react";
import { Check, Loader2, Scale, Bell, Volume2, LogOut, Calendar, Database } from "lucide-react";
import { ChevronDownIcon, ChevronUpIcon } from "../../assets/icons";
import { Chart } from "../../components/ui/Chart";
import { WorkoutCalendar } from "../../components/WorkoutCalendar";
import { useGetBodyWeight, useSaveBodyWeight } from "../../api/profile";
import { parseDate } from "../../lib/date";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";
import {
  isWeightReminderEnabled,
  setWeightReminderEnabled,
  getWeightReminderTime,
  setWeightReminderTime,
  scheduleWeightReminder,
  cancelWeightReminder,
} from "../../utils/notifications";
import { hapticSelection, hapticMedium } from "../../utils/haptics";
import styles from "./Profile.module.css";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const Profile = () => {
  const { user, logout } = useAuth();
  const {
    weightUnit,
    setWeightUnit,
    restTimerAnnounceInterval,
    setRestTimerAnnounceInterval,
  } = useSettings();

  const [weightReminderOn, setWeightReminderOn] = useState(isWeightReminderEnabled);
  const [reminderTime, setReminderTime] = useState(() => {
    const { hour, minute } = getWeightReminderTime();
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  });

  const [avatarError, setAvatarError] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<{ migrated: number; skipped: number; errors: number } | null>(null);
  const { data: weightData, isLoading: isLoadingWeight } = useGetBodyWeight();
  const saveBodyWeight = useSaveBodyWeight();
  const weightEntries = weightData?.entries || [];
  const isSavingWeight = saveBodyWeight.isPending;

  const latestWeight = weightEntries[weightEntries.length - 1];
  const hasLoggedToday = latestWeight
    ? parseDate(latestWeight.date).toDateString() === new Date().toDateString()
    : false;

  const handleSaveWeight = () => {
    if (!weightInput.trim()) return;
    saveBodyWeight.mutate(weightInput, {
      onSuccess: () => setWeightInput(""),
    });
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = parseDate(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const chartData = useMemo(() => {
    if (weightEntries.length === 0) return [];
    return weightEntries.map((entry) => ({
      ...entry,
      displayDate: parseDate(entry.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [weightEntries]);

  const recentEntries = useMemo(() => {
    return [...weightEntries].reverse().slice(0, 7);
  }, [weightEntries]);

  const avgWeight = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, entry) => acc + entry.weight, 0);
    return sum / chartData.length;
  }, [chartData]);

  const handleWeightReminderToggle = async () => {
    hapticMedium();
    const newValue = !weightReminderOn;
    setWeightReminderOn(newValue);
    setWeightReminderEnabled(newValue);

    if (newValue) {
      await scheduleWeightReminder();
    } else {
      await cancelWeightReminder();
    }
  };

  const handleReminderTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    setReminderTime(time);

    const [hour, minute] = time.split(":").map(Number);
    setWeightReminderTime(hour, minute);

    if (weightReminderOn) {
      await scheduleWeightReminder();
    }
  };

  const handleMigrate = async () => {
    setIsMigrating(true);
    setMigrateResult(null);
    try {
      const res = await fetch("http://localhost:3002/api/migrate", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.summary) {
        setMigrateResult(data.summary);
      }
    } catch (error) {
      console.error("Migration failed:", error);
    } finally {
      setIsMigrating(false);
    }
  };

  if (!user) return null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
        <button
          className={styles.calendarBtn}
          onClick={() => {
            hapticSelection();
            setShowCalendar(true);
          }}
        >
          <Calendar size={16} />
          <span>Calendar</span>
        </button>
      </header>

      {/* Calendar Drawer */}
      <WorkoutCalendar
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
      />

      {/* User Card */}
      <div className={styles.userCard}>
        {user.picture && !avatarError ? (
          <img
            src={user.picture}
            alt=""
            className={styles.avatar}
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className={styles.avatarFallback}>{getInitials(user.name)}</div>
        )}
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userEmail}>{user.email}</span>
        </div>
      </div>

      {/* Weight Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Scale size={18} className={styles.sectionIcon} />
          <div>
            <h2 className={styles.sectionTitle}>Body Weight</h2>
            {latestWeight && (
              <span className={styles.sectionMeta}>
                {hasLoggedToday ? "Logged today" : "Ready to log"}
              </span>
            )}
          </div>
        </div>

        <div className={styles.card}>
          {isLoadingWeight ? (
            <div className={styles.cardLoading}>
              <Loader2 size={20} className={styles.spinner} />
            </div>
          ) : (
            <>
              {/* Current Weight */}
              <div className={styles.weightDisplay}>
                {latestWeight ? (
                  <>
                    <span className={styles.weightValue}>{latestWeight.weight}</span>
                    <span className={styles.weightUnit}>{weightUnit}</span>
                  </>
                ) : (
                  <span className={styles.weightEmpty}>No entries yet</span>
                )}
              </div>

              {/* Log Input */}
              {hasLoggedToday ? (
                <div className={styles.loggedBadge}>
                  <Check size={16} />
                  <span>Logged today</span>
                </div>
              ) : (
                <div className={styles.inputRow}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder={`Enter weight (${weightUnit})`}
                    className={styles.input}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveWeight()}
                  />
                  <button
                    onClick={handleSaveWeight}
                    disabled={!weightInput.trim() || isSavingWeight}
                    className={styles.saveBtn}
                  >
                    {isSavingWeight ? (
                      <Loader2 size={18} className={styles.spinner} />
                    ) : (
                      <Check size={18} />
                    )}
                  </button>
                </div>
              )}

              {/* Chart */}
              {chartData.length >= 2 && (
                <div className={styles.chartWrap}>
                  <Chart
                    type="line"
                    data={chartData}
                    xKey="displayDate"
                    series={[{ dataKey: "weight" }]}
                    height={100}
                    yDomain={["dataMin - 0.5", "dataMax + 0.5"]}
                    yTickFormatter={(v) => v.toFixed(1)}
                    tooltipFormatter={(value) => [
                      `${Number(value).toFixed(1)} ${weightUnit}`,
                      "Weight",
                    ]}
                    referenceValue={avgWeight}
                  />
                </div>
              )}

              {/* History Toggle */}
              {weightEntries.length > 0 && (
                <>
                  <button
                    className={styles.historyToggle}
                    onClick={() => setShowWeightHistory(!showWeightHistory)}
                  >
                    <span>Recent entries</span>
                    {showWeightHistory ? (
                      <ChevronUpIcon size={16} />
                    ) : (
                      <ChevronDownIcon size={16} />
                    )}
                  </button>

                  {showWeightHistory && (
                    <div className={styles.historyList}>
                      {recentEntries.map((entry, idx) => (
                        <div key={`${entry.date}-${idx}`} className={styles.historyRow}>
                          <span className={styles.historyDate}>
                            {formatDisplayDate(entry.date)}
                          </span>
                          <span className={styles.historyValue}>
                            {entry.weight} {weightUnit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* Settings Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Settings</h2>
        </div>

        <div className={styles.card}>
          {/* Weight Unit */}
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <Scale size={18} />
              <span>Weight unit</span>
            </div>
            <div className={styles.toggleGroup}>
              <button
                className={`${styles.toggleBtn} ${weightUnit === "kg" ? styles.toggleBtnActive : ""}`}
                onClick={() => {
                  hapticSelection();
                  setWeightUnit("kg");
                }}
              >
                kg
              </button>
              <button
                className={`${styles.toggleBtn} ${weightUnit === "lbs" ? styles.toggleBtnActive : ""}`}
                onClick={() => {
                  hapticSelection();
                  setWeightUnit("lbs");
                }}
              >
                lbs
              </button>
            </div>
          </div>

          {/* Weight Reminder */}
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <Bell size={18} />
              <span>Daily reminder</span>
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
                className={`${styles.switch} ${weightReminderOn ? styles.switchOn : ""}`}
                onClick={handleWeightReminderToggle}
              >
                <span className={styles.switchKnob} />
              </button>
            </div>
          </div>

          {/* Voice Announcements */}
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <Volume2 size={18} />
              <span>Rest timer voice</span>
            </div>
            <div className={styles.toggleGroup}>
              <button
                className={`${styles.toggleBtn} ${restTimerAnnounceInterval === 0 ? styles.toggleBtnActive : ""}`}
                onClick={() => {
                  hapticSelection();
                  setRestTimerAnnounceInterval(0);
                }}
              >
                Off
              </button>
              <button
                className={`${styles.toggleBtn} ${restTimerAnnounceInterval === 30 ? styles.toggleBtnActive : ""}`}
                onClick={() => {
                  hapticSelection();
                  setRestTimerAnnounceInterval(30);
                }}
              >
                30s
              </button>
              <button
                className={`${styles.toggleBtn} ${restTimerAnnounceInterval === 60 ? styles.toggleBtnActive : ""}`}
                onClick={() => {
                  hapticSelection();
                  setRestTimerAnnounceInterval(60);
                }}
              >
                1m
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Data Migration */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Database size={18} className={styles.sectionIcon} />
          <div>
            <h2 className={styles.sectionTitle}>Data Migration</h2>
            <span className={styles.sectionMeta}>Import from Google Sheets</span>
          </div>
        </div>

        <div className={styles.card}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            Migrate your workout data from Google Sheets to the new storage system.
          </p>
          <button
            className={styles.saveBtn}
            onClick={handleMigrate}
            disabled={isMigrating}
            style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}
          >
            {isMigrating ? (
              <>
                <Loader2 size={18} className={styles.spinner} />
                <span style={{ marginLeft: "0.5rem" }}>Migrating...</span>
              </>
            ) : (
              <>
                <Database size={18} />
                <span style={{ marginLeft: "0.5rem" }}>Migrate Data</span>
              </>
            )}
          </button>
          {migrateResult && (
            <div style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}>
              <span style={{ color: "var(--success)" }}>✓ {migrateResult.migrated} migrated</span>
              {migrateResult.skipped > 0 && (
                <span style={{ marginLeft: "1rem", color: "var(--text-secondary)" }}>
                  {migrateResult.skipped} skipped
                </span>
              )}
              {migrateResult.errors > 0 && (
                <span style={{ marginLeft: "1rem", color: "var(--error)" }}>
                  {migrateResult.errors} errors
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Sign Out */}
      <button className={styles.signOutBtn} onClick={logout}>
        <LogOut size={18} />
        <span>Sign out</span>
      </button>
    </div>
  );
};

export default Profile;
