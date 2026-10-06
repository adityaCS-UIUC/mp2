import { NavLink } from 'react-router-dom'
import styles from './Navbar.module.css'

export default function Navbar() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.link} ${styles.active}` : styles.link

  return (
    <header className={styles.header}>
      <NavLink className={styles.brand} to="/" aria-label="Aditya's Cosmic Atlas home">
        <span className={styles.mark} aria-hidden="true">✦</span>
        <span>Aditya's Cosmic Atlas</span>
      </NavLink>
      <nav className={styles.nav} aria-label="Primary navigation">
        <NavLink className={navClass} to="/" end>Search Library</NavLink>
        <NavLink className={navClass} to="/gallery">Mars Gallery</NavLink>
      </nav>
    </header>
  )
}
