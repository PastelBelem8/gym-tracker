import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import styles from './Dashboard.module.css'

const USER_FILTERS = ['All', 'Kat', 'Suse']

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
}

function setsLabel(sets) {
  if (!sets || sets.length === 0) return '—'
  const byWeight = {}
  for (const s of sets) {
    const key = s.weight
    if (!byWeight[key]) byWeight[key] = []
    byWeight[key].push(s.reps)
  }
  return sets.map(s => `${s.reps}×${s.weight}`).join(', ')
}

function ExerciseLogRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  const sets = log.sets ?? []
  const totalVol = sets.reduce((acc, s) => acc + s.reps * s.weight, 0)

  return (
    <div className={styles.logRow} onClick={() => setExpanded(e => !e)}>
      <div className={styles.logTop}>
        <span className={styles.logName}>{log.exercises?.name ?? '—'}</span>
        <span className={styles.logSummary}>
          {sets.length} set{sets.length !== 1 ? 's' : ''} · {totalVol.toFixed(0)} {log.exercises?.canonic_measure ?? ''}
        </span>
      </div>
      {expanded && (
        <div className={styles.logDetail}>
          {sets.map((s, i) => (
            <span key={i} className={styles.setChip}>
              {s.reps} × {s.weight}
            </span>
          ))}
          {log.notes && <p className={styles.logNotes}>{log.notes}</p>}
        </div>
      )}
    </div>
  )
}

function WorkoutCard({ workout }) {
  const logs = workout.exercise_logs ?? []
  const userColor = workout.user === 'Kat' ? styles.kat : styles.suse

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={`${styles.userBadge} ${userColor}`}>{workout.user}</span>
        <span className={styles.cardDate}>{formatDate(workout.date)}</span>
        <span className={styles.cardMeta}>{logs.length} exercise{logs.length !== 1 ? 's' : ''}</span>
      </div>
      {logs.length === 0 ? (
        <p className={styles.emptyLogs}>No exercises logged</p>
      ) : (
        <div className={styles.logList}>
          {logs.map(log => <ExerciseLogRow key={log.id} log={log} />)}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('All')
  const [exerciseFilter, setExerciseFilter] = useState('')

  useEffect(() => {
    async function fetchWorkouts() {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id, user, date,
          exercise_logs (
            id, sets, notes,
            exercises ( id, name, canonic_measure )
          )
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (!error) setWorkouts(data ?? [])
      setLoading(false)
    }
    fetchWorkouts()
  }, [])

  const filtered = workouts.filter(w => {
    if (userFilter !== 'All' && w.user !== userFilter) return false
    if (exerciseFilter.trim()) {
      const q = exerciseFilter.toLowerCase()
      const hasMatch = w.exercise_logs?.some(l =>
        l.exercises?.name?.toLowerCase().includes(q)
      )
      if (!hasMatch) return false
    }
    return true
  })

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Dashboard</h1>

      <div className={styles.filters}>
        <div className={styles.userTabs}>
          {USER_FILTERS.map(u => (
            <button
              key={u}
              className={`${styles.tab} ${userFilter === u ? styles.tabActive : ''}`}
              onClick={() => setUserFilter(u)}
            >
              {u}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Filter by exercise…"
          value={exerciseFilter}
          onChange={e => setExerciseFilter(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {loading && <p className={styles.muted}>Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className={styles.empty}>
          <p>No workouts logged yet.</p>
          <p className={styles.muted}>Start a session in the Log tab to see history here.</p>
        </div>
      )}

      <div className={styles.list}>
        {filtered.map(w => <WorkoutCard key={w.id} workout={w} />)}
      </div>
    </div>
  )
}
