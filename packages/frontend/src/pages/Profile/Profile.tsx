import { useState, useMemo } from "react";
import {
  LogOut,
  Bell,
  Volume2,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useGetBodyWeight, useSaveBodyWeight } from "../../api/profile";
import { parseDate } from "../../lib/date";

const BodyScaleIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 9v3" />
    <circle cx="12" cy="12" r="0.5" fill="currentColor" />
  </svg>
);
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

  // Weight reminder state
  const [weightReminderOn, setWeightReminderOn] = useState(
    isWeightReminderEnabled,
  );
  const [reminderTime, setReminderTime] = useState(() => {
    const { hour, minute } = getWeightReminderTime();
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  });

  // Weight tracking state
  const [weightInput, setWeightInput] = useState("");
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const { data: weightData, isLoading: isLoadingWeight } = useGetBodyWeight();
  const saveBodyWeight = useSaveBodyWeight();
  const weightEntries = weightData?.entries || [];
  const isSavingWeight = saveBodyWeight.isPending;

  // Entries are sorted ascending, so latest is last
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

  // Prepare chart data with formatted dates for display
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

  // Recent entries for history (most recent first)
  const recentEntries = useMemo(() => {
    return [...weightEntries].reverse().slice(0, 7);
  }, [weightEntries]);

  const avgWeight = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, entry) => acc + entry.weight, 0);
    return sum / chartData.length;
  }, [chartData]);

  const handleWeightReminderToggle = async () => {
    const newValue = !weightReminderOn;
    setWeightReminderOn(newValue);
    setWeightReminderEnabled(newValue);

    if (newValue) {
      await scheduleWeightReminder();
    } else {
      await cancelWeightReminder();
    }
  };

  const handleReminderTimeChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const time = e.target.value;
    setReminderTime(time);

    const [hour, minute] = time.split(":").map(Number);
    setWeightReminderTime(hour, minute);

    if (weightReminderOn) {
      await scheduleWeightReminder();
    }
  };

  if (!user) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
      </div>

      {/* User info card */}
      <div className={styles.userCard}>
        <div className={styles.avatar}>{getInitials(user.name)}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userEmail}>{user.email}</span>
        </div>
      </div>

      {/* Weight section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Body Weight</h2>

        <div className={styles.weightCard}>
          {isLoadingWeight ? (
            <div className={styles.weightLoading}>
              <Loader2 size={18} className={styles.spinner} />
            </div>
          ) : (
            <>
              {/* Current weight display */}
              <div className={styles.weightMain}>
                {latestWeight ? (
                  <div className={styles.weightCurrent}>
                    <span className={styles.weightValue}>
                      {latestWeight.weight}
                    </span>
                    <span className={styles.weightUnit}>{weightUnit}</span>
                  </div>
                ) : (
                  <span className={styles.noWeight}>No entries yet</span>
                )}
              </div>

              {/* Log weight input */}
              {hasLoggedToday ? (
                <div className={styles.loggedToday}>
                  <Check size={16} />
                  <span>Logged today</span>
                </div>
              ) : (
                <div className={styles.weightInputRow}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder={`Log weight (${weightUnit})`}
                    className={styles.weightInput}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveWeight()}
                  />
                  <button
                    onClick={handleSaveWeight}
                    disabled={!weightInput.trim() || isSavingWeight}
                    className={styles.weightSaveBtn}
                  >
                    {isSavingWeight ? (
                      <Loader2 size={18} className={styles.spinner} />
                    ) : (
                      <Check size={18} />
                    )}
                  </button>
                </div>
              )}

              {/* Weight Chart */}
              {chartData.length >= 2 && (
                <div className={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="displayDate"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={["dataMin - 0.5", "dataMax + 0.5"]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        tickFormatter={(v) => v.toFixed(1)}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          fontSize: "12px",
                        }}
                        labelStyle={{
                          color: "var(--text-muted)",
                          marginBottom: "4px",
                        }}
                        itemStyle={{ color: "var(--text-primary)" }}
                        formatter={(value) => [
                          `${Number(value).toFixed(1)} ${weightUnit}`,
                          "Weight",
                        ]}
                      />
                      <ReferenceLine
                        y={avgWeight}
                        stroke="var(--text-muted)"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{
                          fill: "var(--bg-primary)",
                          stroke: "#3b82f6",
                          strokeWidth: 2,
                          r: 3,
                        }}
                        activeDot={{
                          fill: "#3b82f6",
                          stroke: "var(--bg-primary)",
                          strokeWidth: 2,
                          r: 5,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent history toggle */}
              {weightEntries.length > 0 && (
                <>
                  <button
                    className={styles.historyToggle}
                    onClick={() => setShowWeightHistory(!showWeightHistory)}
                  >
                    <span>Recent entries</span>
                    {showWeightHistory ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>

                  {showWeightHistory && (
                    <div className={styles.weightHistory}>
                      {recentEntries.map((entry, idx) => (
                        <div
                          key={`${entry.date}-${idx}`}
                          className={styles.historyRow}
                        >
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
                </>
              )}
            </>
          )}
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
                className={`${styles.unitBtn} ${weightUnit === "kg" ? styles.unitBtnActive : ""}`}
                onClick={() => setWeightUnit("kg")}
              >
                kg
              </button>
              <button
                className={`${styles.unitBtn} ${weightUnit === "lbs" ? styles.unitBtnActive : ""}`}
                onClick={() => setWeightUnit("lbs")}
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
                className={`${styles.toggleBtn} ${weightReminderOn ? styles.toggleBtnActive : ""}`}
                onClick={handleWeightReminderToggle}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          </div>

          {/* Voice Announcements for Rest Timer */}
          <div className={styles.settingsRow}>
            <div className={styles.settingsLabel}>
              <Volume2 size={18} />
              <span>Rest timer voice</span>
            </div>
            <div className={styles.alertToggle}>
              <button
                className={`${styles.alertBtn} ${restTimerAnnounceInterval === 0 ? styles.alertBtnActive : ""}`}
                onClick={() => setRestTimerAnnounceInterval(0)}
              >
                Off
              </button>
              <button
                className={`${styles.alertBtn} ${restTimerAnnounceInterval === 30 ? styles.alertBtnActive : ""}`}
                onClick={() => setRestTimerAnnounceInterval(30)}
              >
                30s
              </button>
              <button
                className={`${styles.alertBtn} ${restTimerAnnounceInterval === 60 ? styles.alertBtnActive : ""}`}
                onClick={() => setRestTimerAnnounceInterval(60)}
              >
                1m
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
  );
};

export default Profile;
