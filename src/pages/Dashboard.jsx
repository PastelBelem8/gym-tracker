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

function EditLogModal({ log, onClose, onSaved }) {
  const [sets, setSets] = useState(
    (log.sets ?? []).map(s => ({ reps: s.reps, weight: s.weight }))
  )
  const [notes, setNotes] = useState(log.notes ?? '')
  const [saving, setSaving] = useState(false)
  const unit = log.exercises?.canonic_measure ?? 'lbs'

  const updateSet = (i, field, val) =>
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))

  const addSet = () => {
    const last = sets[sets.length - 1]
    setSets(prev => [...prev, { reps: last?.reps ?? '', weight: last?.weight ?? '' }])
  }

  const removeSet = (i) => setSets(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    const cleaned = sets
      .filter(s => s.reps !== '' && s.weight !== '')
      .map(s => ({ reps: Number(s.reps), weight: Number(s.weight) }))
    if (cleaned.length === 0) return
    setSaving(true)
    const { error } = await supabase
      .from('exercise_logs')
      .update({ sets: cleaned, notes: notes.trim() || null })
      .eq('id', log.id)
    setSaving(false)
    if (error) { alert('Save failed: ' + error.message); return }
    onSaved({ ...log, sets: cleaned, notes: notes.trim() || null })
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{log.exercises?.name ?? 'Edit log'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.editSetHeader}>
          <span>#</span><span>Reps</span><span>Weight ({unit})</span><span></span>
        </div>

        {sets.map((s, i) => (
          <div key={i} className={styles.editSetRow}>
            <span className={styles.setIdx}>{i + 1}</span>
            <input
              type="number"
              min="1"
              value={s.reps}
              onChange={e => updateSet(i, 'reps', e.target.value)}
            />
            <input
              type="number"
              min="0"
              step="0.5"
              value={s.weight}
              onChange={e => updateSet(i, 'weight', e.target.value)}
            />
            <button className={styles.removeSetBtn} onClick={() => removeSet(i)} title="Remove set">✕</button>
          </div>
        ))}

        <button className={styles.addSetBtn} onClick={addSet}>+ Set</button>

        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className={styles.notesInput}
          rows={2}
        />

        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

function ExerciseLogRow({ log, onLogUpdated }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [currentLog, setCurrentLog] = useState(log)
  const sets = currentLog.sets ?? []
  const totalVol = sets.reduce((acc, s) => acc + s.reps * s.weight, 0)
  const unit = currentLog.exercises?.canonic_measure ?? ''

  const handleSaved = (updated) => {
    setCurrentLog(updated)
    onLogUpdated?.(updated)
  }

  return (
    <>
      <div className={styles.logRow} onClick={() => setExpanded(e => !e)}>
        <div className={styles.logTop}>
          <span className={styles.logName}>{currentLog.exercises?.name ?? '—'}</span>
          <span className={styles.logSummary}>
            {sets.length} set{sets.length !== 1 ? 's' : ''} · {totalVol.toFixed(0)} {unit}
          </span>
        </div>
        {expanded && (
          <div className={styles.logDetail}>
            {sets.map((s, i) => (
              <span key={i} className={styles.setChip}>
                {s.reps} × {s.weight}
              </span>
            ))}
            {currentLog.notes && <p className={styles.logNotes}>{currentLog.notes}</p>}
            <button
              className={styles.editBtn}
              onClick={e => { e.stopPropagation(); setEditing(true) }}
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {editing && (
        <EditLogModal
          log={currentLog}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
        />
      )}
    </>
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
      <div className={styles.logList}>
        {logs.map(log => <ExerciseLogRow key={log.id} log={log} />)}
      </div>
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
          exercise_logs!inner (
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
