import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, History, Dumbbell, LogOut, Scale } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useWorkout } from '../../contexts/WorkoutContext'
import styles from './Layout.module.css'

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/history', label: 'History', icon: History },
  { to: '/programs', label: 'Programs', icon: Dumbbell },
]

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth()
  const { weightUnit, setWeightUnit } = useSettings()
  const { activeWorkout } = useWorkout()
  const location = useLocation()
  const [showPopover, setShowPopover] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActiveRoute = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className={styles.container}>
      {/* Mobile Header - hide during active workout */}
      {isMobile && !activeWorkout && (
        <header className={styles.mobileHeader}>
          <div className={styles.mobileHeaderLogo}>
            <Dumbbell size={20} />
            <span>Gymerr</span>
          </div>
          {user && (
            <div className={styles.mobileUserSection} ref={popoverRef}>
              <button
                className={styles.mobileAvatarBtn}
                onClick={() => setShowPopover(!showPopover)}
              >
                <div className={styles.mobileAvatar}>
                  {getInitials(user.name)}
                </div>
              </button>
              {showPopover && (
                <div className={styles.mobilePopover}>
                  <div className={styles.popoverHeader}>
                    <div className={styles.popoverAvatar}>{getInitials(user.name)}</div>
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
                  <button className={styles.signOutButton} onClick={logout}>
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </header>
      )}

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
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className={styles.userSection} ref={!isMobile ? popoverRef : undefined}>
            <button
              className={styles.userButton}
              onClick={() => setShowPopover(!showPopover)}
            >
              <div className={styles.avatar}>
                {getInitials(user.name)}
              </div>
              <span className={styles.userName}>{user.name}</span>
            </button>
            {showPopover && !isMobile && (
              <div className={styles.popover}>
                <div className={styles.popoverHeader}>
                  <div className={styles.popoverAvatar}>{getInitials(user.name)}</div>
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
                <button className={styles.signOutButton} onClick={logout}>
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      <main className={styles.main}>{children}</main>

      {/* Mobile Bottom Navigation - hide during active workout */}
      {isMobile && !activeWorkout && (
        <nav className={styles.bottomNav}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={`${styles.bottomNavItem} ${isActiveRoute(to) ? styles.bottomNavActive : ''}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}

export default Layout
