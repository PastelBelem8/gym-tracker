import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import LogWorkout from './pages/LogWorkout.jsx'
import ExerciseManagement from './pages/ExerciseManagement.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Progress from './pages/Progress.jsx'
import styles from './App.module.css'

export default function App() {
  return (
    <BrowserRouter basename="/gym-tracker">
      <div className={styles.app}>
        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => isActive ? styles.active : ''}>Log</NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? styles.active : ''}>History</NavLink>
          <NavLink to="/progress" className={({ isActive }) => isActive ? styles.active : ''}>Progress</NavLink>
          <NavLink to="/exercises" className={({ isActive }) => isActive ? styles.active : ''}>Exercises</NavLink>
        </nav>
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<LogWorkout />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/exercises" element={<ExerciseManagement />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
