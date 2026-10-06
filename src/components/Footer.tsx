import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p>Built with public data from NASA.</p>
      <nav aria-label="NASA data sources">
        <a href="https://images.nasa.gov/" target="_blank" rel="noreferrer">
          Image Library
        </a>
        <a href="https://api.nasa.gov/" target="_blank" rel="noreferrer">
          Open APIs
        </a>
      </nav>
    </footer>
  )
}
