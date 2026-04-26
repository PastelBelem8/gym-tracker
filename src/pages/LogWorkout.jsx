import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import styles from './LogWorkout.module.css'

const USERS = ['Kat', 'Suse']
const MEASURES = ['lbs', 'kg', 's', 'min']

function convertToCanonic(weight, fromMeasure, canonicMeasure) {
  if (fromMeasure === canonicMeasure) return weight
  if (fromMeasure === 'kg' && canonicMeasure === 'lbs') return +(weight * 2.20462).toFixed(2)
  if (fromMeasure === 'lbs' && canonicMeasure === 'kg') return +(weight / 2.20462).toFixed(2)
  return weight
}

function emptySet() {
  return { reps: '', weight: '', measure: 'lbs', done: false, timerLeft: null }
}

function SetRow({ set, index, canonicMeasure, onChange, onCheck }) {
  const timerRef = useRef(null)
  const isRunning = set.timerLeft !== null && set.timerLeft > 0

  useEffect(() => {
    if (!isRunning) return
    timerRef.current = setInterval(() => {
      onChange(index, 'timerLeft', prev => {
        const next = (prev ?? 0) - 1
        if (next <= 0) clearInterval(timerRef.current)
        return Math.max(0, next)
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [isRunning])

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className={`${styles.setRow} ${set.done ? styles.setDone : ''}`}>
      <span className={styles.setIndex}>{index + 1}</span>
      <input
        type="number"
        placeholder="reps"
        value={set.reps}
        min="1"
        className={styles.repsInput}
        onChange={e => onChange(index, 'reps', e.target.value)}
        disabled={set.done}
      />
      <input
        type="number"
        placeholder="weight"
        value={set.weight}
        min="0"
        step="0.5"
        className={styles.weightInput}
        onChange={e => onChange(index, 'weight', e.target.value)}
        disabled={set.done}
      />
      <select
        value={set.measure}
        className={styles.measureSelect}
        onChange={e => onChange(index, 'measure', e.target.value)}
        disabled={set.done}
      >
        {MEASURES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <button
        className={`${styles.checkBtn} ${set.done ? styles.checked : ''}`}
        onClick={() => onCheck(index)}
        title={set.done ? 'Completed' : 'Mark complete'}
      >
        {set.done ? '✓' : '○'}
      </button>
      {set.done && set.timerLeft !== null && set.timerLeft > 0 && (
        <span className={styles.timer}>{formatTime(set.timerLeft)}</span>
      )}
      {set.done && set.timerLeft === 0 && (
        <span className={styles.timerDone}>Rest done!</span>
      )}
    </div>
  )
}


function ExerciseAutocomplete({ exercises, value, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = query.length > 0
    ? exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : exercises

  const handleSelect = (ex) => {
    onSelect(ex)
    setQuery(ex.name)
    setOpen(false)
  }

  return (
    <div className={styles.autocompleteWrap}>
      <input
        type="text"
        placeholder="Search exercise…"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <ul className={styles.dropdown}>
          {filtered.length === 0 && (
            <li className={styles.dropdownEmpty}>No exercises yet — add one in Exercises tab</li>
          )}
          {filtered.map(ex => (
            <li key={ex.id} onMouseDown={() => handleSelect(ex)}>
              <span>{ex.name}</span>
              <span className={styles.exType}>{ex.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function LogWorkout() {
  const [activeUser, setActiveUser] = useState('Kat')
  const [session, setSession] = useState(null) // { Kat: workoutId, Suse: workoutId }
  const [starting, setStarting] = useState(false)
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [sets, setSets] = useState([emptySet(), emptySet(), emptySet()])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedLogs, setSavedLogs] = useState({ Kat: [], Suse: [] })

  useEffect(() => {
    supabase.from('exercises').select('*').order('name').then(({ data }) => {
      if (data) setExercises(data)
    })
  }, [])

  const startSession = async () => {
    setStarting(true)
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('workouts')
      .insert([
        { user: 'Kat', date: today },
        { user: 'Suse', date: today },
      ])
      .select()
    setStarting(false)
    if (error) { alert('Failed to start session: ' + error.message); return }
    const katWorkout = data.find(w => w.user === 'Kat')
    const suseWorkout = data.find(w => w.user === 'Suse')
    setSession({ Kat: katWorkout.id, Suse: suseWorkout.id })
  }

  const loadLastSession = useCallback(async (exerciseId) => {
    const { data } = await supabase
      .from('exercise_logs')
      .select('sets, workout_id, workouts!inner(user, date)')
      .eq('exercise_id', exerciseId)
      .eq('workouts.user', activeUser)
      .order('workouts(date)', { ascending: false })
      .limit(1)
    return data?.[0]?.sets ?? null
  }, [activeUser])

  const handleSelectExercise = async (ex) => {
    setSelectedExercise(ex)
    const lastSets = await loadLastSession(ex.id)
    if (lastSets && lastSets.length > 0) {
      setSets(lastSets.map(s => ({
        reps: s.reps,
        weight: s.weight,
        measure: ex.canonic_measure,
        done: false,
        timerLeft: null,
      })))
    } else {
      setSets([
        { ...emptySet(), measure: ex.canonic_measure },
        { ...emptySet(), measure: ex.canonic_measure },
        { ...emptySet(), measure: ex.canonic_measure },
      ])
    }
    setNotes('')
  }

  const handleSetChange = (index, field, value) => {
    setSets(prev => prev.map((s, i) => {
      if (i !== index) return s
      const newVal = typeof value === 'function' ? value(s[field]) : value
      return { ...s, [field]: newVal }
    }))
  }

  const handleCheck = (index) => {
    setSets(prev => prev.map((s, i) => {
      if (i !== index || s.done) return s
      return { ...s, done: true, timerLeft: 60 }
    }))
  }

  const addSet = () => {
    const last = sets[sets.length - 1]
    setSets(prev => [...prev, {
      reps: last?.reps ?? '',
      weight: last?.weight ?? '',
      measure: selectedExercise?.canonic_measure ?? 'lbs',
      done: false,
      timerLeft: null,
    }])
  }

  const removeSet = () => {
    if (sets.length > 1) setSets(prev => prev.slice(0, -1))
  }

  const saveLog = async () => {
    if (!selectedExercise) return
    const workoutId = session[activeUser]
    const canonicMeasure = selectedExercise.canonic_measure

    const convertedSets = sets
      .filter(s => s.reps !== '' && s.weight !== '')
      .map(s => ({
        reps: Number(s.reps),
        weight: convertToCanonic(Number(s.weight), s.measure, canonicMeasure),
      }))

    if (convertedSets.length === 0) return

    setSaving(true)
    const { data, error } = await supabase
      .from('exercise_logs')
      .insert({ workout_id: workoutId, exercise_id: selectedExercise.id, sets: convertedSets, notes })
      .select()
    setSaving(false)

    if (error) { alert('Save failed: ' + error.message); return }

    setSavedLogs(prev => ({
      ...prev,
      [activeUser]: [...prev[activeUser], { exercise: selectedExercise, sets: convertedSets, notes }],
    }))
    setSelectedExercise(null)
    setSets([emptySet(), emptySet(), emptySet()])
    setNotes('')
  }

  if (!session) {
    return (
      <div className={styles.startScreen}>
        <h1>Gym Tracker</h1>
        <p className={styles.subtitle}>Ready to crush it?</p>
        <button className={styles.startBtn} onClick={startSession} disabled={starting}>
          {starting ? 'Starting…' : 'Start Session'}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.userToggle}>
        {USERS.map(u => (
          <button
            key={u}
            className={`${styles.userBtn} ${activeUser === u ? styles[`active${u}`] : ''}`}
            onClick={() => setActiveUser(u)}
          >
            {u}
          </button>
        ))}
      </div>

      <div className={styles.loggedList}>
        {savedLogs[activeUser].map((log, i) => (
          <div key={i} className={styles.loggedItem}>
            <span className={styles.loggedName}>{log.exercise.name}</span>
            <span className={styles.loggedSets}>{log.sets.length} sets</span>
          </div>
        ))}
        {savedLogs[activeUser].length === 0 && (
          <p className={styles.emptyNote}>No exercises logged yet for {activeUser}</p>
        )}
      </div>

      <div className={styles.builder}>
        <h2 className={styles.builderTitle}>Add Exercise</h2>
        <ExerciseAutocomplete
          exercises={exercises}
          value={selectedExercise}
          onSelect={handleSelectExercise}
        />

        {selectedExercise && (
          <>
            <div className={styles.exerciseInfo}>
              <span className={styles.exTag}>{selectedExercise.type}</span>
              <span className={styles.exTag}>{selectedExercise.canonic_measure}</span>
              {selectedExercise.body_parts.map(bp => (
                <span key={bp} className={styles.exTag}>{bp}</span>
              ))}
            </div>

            <div className={styles.setHeader}>
              <span>#</span><span>Reps</span><span>Weight</span><span>Unit</span><span></span>
            </div>

            {sets.map((set, i) => (
              <SetRow
                key={i}
                set={set}
                index={i}
                canonicMeasure={selectedExercise.canonic_measure}
                onChange={handleSetChange}
                onCheck={handleCheck}
              />
            ))}

            <div className={styles.setActions}>
              <button className={styles.addSetBtn} onClick={addSet}>+ Set</button>
              {sets.length > 1 && (
                <button className={styles.removeSetBtn} onClick={removeSet}>− Set</button>
              )}
            </div>

            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={styles.notes}
              rows={2}
            />

            <button
              className={styles.saveBtn}
              onClick={saveLog}
              disabled={saving}
            >
              {saving ? 'Saving…' : `Save for ${activeUser}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
