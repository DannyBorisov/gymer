import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Dumbbell,
  LogOut,
  Scale,
  User,
  Timer,
  BarChart3,
  Play,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useWorkout } from "../../contexts/WorkoutContext";
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
    showRestSuggestion,
    setShowRestSuggestion,
    restTimerDuration,
    setRestTimerDuration,
  } = useSettings();
  const { activeWorkout } = useWorkout();
  const location = useLocation();
  const [showPopover, setShowPopover] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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
                      <Timer size={16} />
                      <span>Rest timer prompts</span>
                    </div>
                    <button
                      className={`${styles.toggleBtn} ${showRestSuggestion ? styles.toggleBtnActive : ""}`}
                      onClick={() => setShowRestSuggestion(!showRestSuggestion)}
                    >
                      <span className={styles.toggleKnob} />
                    </button>
                  </div>
                  <div className={styles.settingsRow}>
                    <div className={styles.settingsLabel}>
                      <Timer size={16} />
                      <span>Vibrate after</span>
                    </div>
                    <div className={styles.durationToggle}>
                      {[60, 90, 120].map((sec) => (
                        <button
                          key={sec}
                          className={`${styles.durationBtn} ${restTimerDuration === sec ? styles.durationBtnActive : ""}`}
                          onClick={() => setRestTimerDuration(sec)}
                        >
                          {sec < 60 ? `${sec}s` : `${sec / 60}m`}
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

      {/* Mobile Bottom Navigation - hide during active workout */}
      {isMobile && !activeWorkout && (
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

          {/* Center Start Workout Button - round elevated */}
          <NavLink
            to="/start-workout"
            className={`${styles.centerBtn} ${isActiveRoute("/start-workout") ? styles.centerBtnActive : ""}`}
          >
            <Play size={28} />
          </NavLink>

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
