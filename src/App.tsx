import { Navigate, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import ScrollToTop from './components/ScrollToTop'
import DetailView from './pages/DetailView'
import GalleryView from './pages/GalleryView'
import ListView from './pages/ListView'
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.app}>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<ListView />} />
        <Route path="/gallery" element={<GalleryView />} />
        <Route path="/details/:id" element={<DetailView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  )
}
