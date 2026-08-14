import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, History, Dumbbell, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
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
  { to: '/history', label: 'Workout History', icon: History },
  { to: '/programs', label: 'Programs', icon: Dumbbell },
]

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth()
  const [showPopover, setShowPopover] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={styles.container}>
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
          <div className={styles.userSection} ref={popoverRef}>
            <button
              className={styles.userButton}
              onClick={() => setShowPopover(!showPopover)}
            >
              <div className={styles.avatar}>
                {getInitials(user.name)}
              </div>
              <span className={styles.userName}>{user.name}</span>
            </button>
            {showPopover && (
              <div className={styles.popover}>
                <div className={styles.popoverHeader}>
                  <div className={styles.popoverAvatar}>{getInitials(user.name)}</div>
                  <div className={styles.popoverInfo}>
                    <span className={styles.popoverName}>{user.name}</span>
                    <span className={styles.popoverEmail}>{user.email}</span>
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
    </div>
  )
}

export default Layout
