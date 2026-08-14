import { NavLink } from 'react-router-dom'
import { LayoutDashboard, History, Dumbbell, Plus } from 'lucide-react'
import styles from './Layout.module.css'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/history', label: 'Workout History', icon: History },
  { to: '/programs', label: 'Programs', icon: Dumbbell },
]

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
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

        <NavLink to="/programs/create" className={styles.createButton}>
          <Plus size={18} />
          <span>Create Program</span>
        </NavLink>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  )
}

export default Layout
