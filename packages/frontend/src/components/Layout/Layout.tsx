import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Dumbbell,
  LogOut,
  Scale,
  User,
  BarChart3,
  Play,
  ClipboardList,
  Volume2,
  Pause,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useWorkout } from "../../contexts/WorkoutContext";
import { useQuickWorkout } from "../../contexts/QuickWorkoutContext";
import { formatTime } from "../../lib/time";
import styles from "./Layout.module.css";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const navItemsLeft = [
  { to: "/programs", label: "Programs", icon: Dumbbell },
  { to: "/workouts", label: "Workouts", icon: ClipboardList },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const navItemsRight: { to: string; label: string; icon: typeof Dumbbell }[] =
  [];

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const {
    weightUnit,
    setWeightUnit,
    restTimerAnnounceInterval,
    setRestTimerAnnounceInterval,
  } = useSettings();
  const { activeWorkout, timer } = useWorkout();
  const { floatingAction } = useQuickWorkout();
  const location = useLocation();
  const navigate = useNavigate();
  const [showPopover, setShowPopover] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const hasFloatingAction = floatingAction !== null;
  const isOnWorkoutPage = location.pathname === "/workout";
  const hasMinimizedWorkout = activeWorkout && !isOnWorkoutPage;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActiveRoute = (path: string) => {
    if (path === "/programs")
      return (
        location.pathname === "/programs" ||
        location.pathname.startsWith("/programs/")
      );
    return location.pathname.startsWith(path);
  };

  return (
    <div className={styles.container}>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Dumbbell size={24} />
          <span>Gymerr</span>
        </div>

        <nav className={styles.nav}>
          {[...navItemsLeft, ...navItemsRight].map(
            ({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ""}`
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ),
          )}
        </nav>

        {user && (
          <div
            className={styles.userSection}
            ref={!isMobile ? popoverRef : undefined}
          >
            <button
              className={styles.userButton}
              onClick={() => setShowPopover(!showPopover)}
            >
              <div className={styles.avatar}>{getInitials(user.name)}</div>
              <span className={styles.userName}>{user.name}</span>
            </button>
            {showPopover && !isMobile && (
              <div className={styles.popover}>
                <div className={styles.popoverHeader}>
                  <div className={styles.popoverAvatar}>
                    {getInitials(user.name)}
                  </div>
                  <div className={styles.popoverInfo}>
                    <span className={styles.popoverName}>{user.name}</span>
                    <span className={styles.popoverEmail}>{user.email}</span>
                  </div>
                </div>
                <div className={styles.settingsSection}>
                  <div className={styles.settingsRow}>
                    <div className={styles.settingsLabel}>
                      <Scale size={16} />
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
                  <div className={styles.settingsRow}>
                    <div className={styles.settingsLabel}>
                      <Volume2 size={16} />
                      <span>Rest timer voice</span>
                    </div>
                    <div className={styles.durationToggle}>
                      {[0, 30, 60].map((sec) => (
                        <button
                          key={sec}
                          className={`${styles.durationBtn} ${restTimerAnnounceInterval === sec ? styles.durationBtnActive : ""}`}
                          onClick={() => setRestTimerAnnounceInterval(sec)}
                        >
                          {sec === 0 ? "Off" : `${sec}s`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button className={styles.signOutButton} onClick={logout}>
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      <main className={`${styles.main} ${activeWorkout ? styles.mainWorkout : ''}`}>{children}</main>

      {/* Mobile Bottom Navigation - hide when on workout page */}
      {isMobile && !isOnWorkoutPage && (
        <nav className={styles.bottomNav}>
          <NavLink
            to="/programs"
            className={`${styles.bottomNavItem} ${isActiveRoute("/programs") ? styles.bottomNavActive : ""}`}
          >
            <div className={styles.navIconWrapper}>
              <Dumbbell size={22} />
            </div>
            <span>Programs</span>
          </NavLink>

          <NavLink
            to="/workouts"
            className={`${styles.bottomNavItem} ${isActiveRoute("/workouts") ? styles.bottomNavActive : ""}`}
          >
            <div className={styles.navIconWrapper}>
              <ClipboardList size={22} />
            </div>
            <span>Workouts</span>
          </NavLink>

          {/* Center Button - shows timer when workout is minimized */}
          <div className={styles.centerBtnWrapper}>
            <button
              className={`${styles.centerBtn} ${hasMinimizedWorkout ? styles.centerBtnActive : ''} ${hasFloatingAction ? styles.centerBtnLifted : ''} ${hasFloatingAction && !floatingAction?.enabled ? styles.centerBtnDisabled : ''}`}
              onClick={() => {
                if (hasMinimizedWorkout) {
                  navigate("/workout");
                } else if (hasFloatingAction && floatingAction?.enabled) {
                  floatingAction.handler();
                } else if (!hasFloatingAction) {
                  navigate("/start-workout");
                }
              }}
            >
              {hasMinimizedWorkout ? <Pause size={22} /> : <Play size={22} />}
              <span className={styles.centerBtnText}>
                {hasMinimizedWorkout ? formatTime(timer) : (floatingAction?.label || "Start Workout")}
              </span>
            </button>
          </div>

          <NavLink
            to="/analytics"
            className={`${styles.bottomNavItem} ${isActiveRoute("/analytics") ? styles.bottomNavActive : ""}`}
          >
            <div className={styles.navIconWrapper}>
              <BarChart3 size={22} />
            </div>
            <span>Analytics</span>
          </NavLink>

          {user && (
            <NavLink
              to="/profile"
              className={`${styles.bottomNavItem} ${isActiveRoute("/profile") ? styles.bottomNavActive : ""}`}
            >
              <div className={styles.navIconWrapper}>
                <User size={22} />
              </div>
              <span>Profile</span>
            </NavLink>
          )}
        </nav>
      )}
    </div>
  );
};

export default Layout;
