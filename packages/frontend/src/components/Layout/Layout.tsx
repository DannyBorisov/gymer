import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Dumbbell,
  LogOut,
  Scale,
  User,
  ClipboardList,
  Volume2,
  Pause,
  Home,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useWorkout } from "../../contexts/WorkoutContext";
import { formatTime } from "../../lib/time";
import styles from "./Layout.module.css";
import useClickOutside from "../../hooks/useClickOutside";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const navItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/programs", label: "Programs", icon: Dumbbell },
  { to: "/history", label: "History", icon: ClipboardList },
  { to: "/profile", label: "Profile", icon: User },
];

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
  const location = useLocation();
  const navigate = useNavigate();
  const [showPopover, setShowPopover] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isOnWorkoutPage = location.pathname === "/workout";
  const hasMinimizedWorkout = activeWorkout && !isOnWorkoutPage;
  const needsDrawerPadding = isOnWorkoutPage || hasMinimizedWorkout;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useClickOutside(popoverRef.current, setShowPopover);

  const isActiveRoute = (path: string) => {
    if (path === "/home") {
      return location.pathname === "/home" || location.pathname === "/";
    }
    if (path === "/programs") {
      return (
        location.pathname === "/programs" ||
        location.pathname.startsWith("/programs/")
      );
    }
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
          {navItems.map(({ to, label, icon: Icon }) => (
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
          ))}
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

      <main
        className={`${styles.main} ${needsDrawerPadding ? styles.mainWithDrawer : ""}`}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className={styles.bottomNav}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={`${styles.bottomNavItem} ${isActiveRoute(to) ? styles.bottomNavActive : ""}`}
            >
              <div className={styles.navIconWrapper}>
                <Icon size={22} />
              </div>
              <span>{label}</span>
            </NavLink>
          ))}

          {/* Floating workout indicator when workout is minimized */}
          {hasMinimizedWorkout && (
            <button
              className={styles.workoutIndicator}
              onClick={() => navigate("/workout")}
              style={{
                position: "absolute",
                top: "-48px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <Pause size={18} className={styles.pulseIcon} />
              <span>{formatTime(timer)}</span>
            </button>
          )}
        </nav>
      )}
    </div>
  );
};

export default Layout;
