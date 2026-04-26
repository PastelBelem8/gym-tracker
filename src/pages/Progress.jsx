import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase.js'
import styles from './Progress.module.css'

const USERS = ['Kat', 'Suse']

function shortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function EmptyChart({ label }) {
  return (
    <div className={styles.emptyChart}>
      <span>{label}</span>
    </div>
  )
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipDate}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value} {p.unit ?? unit ?? ''}
        </p>
      ))}
    </div>
  )
}

export default function Progress() {
  const [activeUser, setActiveUser] = useState('Kat')
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)

  // Per-exercise chart data
  const [exerciseData, setExerciseData] = useState([])
  const [loadingExercise, setLoadingExercise] = useState(false)

  // Body part volume data
  const [bodyPartData, setBodyPartData] = useState([])
  const [bodyPartKeys, setBodyPartKeys] = useState([])
  const [loadingBodyPart, setLoadingBodyPart] = useState(false)

  useEffect(() => {
    supabase.from('exercises').select('id, name, canonic_measure, body_parts').order('name')
      .then(({ data }) => setExercises(data ?? []))
  }, [])

  // Reload body-part chart when user changes
  useEffect(() => {
    fetchBodyPartData(activeUser)
  }, [activeUser])

  // Reload exercise chart when user or exercise changes
  useEffect(() => {
    if (selectedExercise) fetchExerciseData(activeUser, selectedExercise)
    else setExerciseData([])
  }, [activeUser, selectedExercise])

  async function fetchExerciseData(user, exercise) {
    setLoadingExercise(true)
    const { data } = await supabase
      .from('workouts')
      .select('date, exercise_logs!inner(sets)')
      .eq('user', user)
      .eq('exercise_logs.exercise_id', exercise.id)
      .order('date', { ascending: true })

    const byDate = {}
    for (const workout of data ?? []) {
      const date = workout.date
      if (!byDate[date]) byDate[date] = { date, maxWeight: 0, totalVolume: 0 }
      for (const log of workout.exercise_logs ?? []) {
        for (const s of log.sets ?? []) {
          byDate[date].maxWeight = Math.max(byDate[date].maxWeight, s.weight)
          byDate[date].totalVolume += s.reps * s.weight
        }
      }
    }

    setExerciseData(
      Object.values(byDate).map(d => ({
        date: shortDate(d.date),
        'Max Weight': +d.maxWeight.toFixed(2),
        'Total Volume': +d.totalVolume.toFixed(1),
      }))
    )
    setLoadingExercise(false)
  }

  async function fetchBodyPartData(user) {
    setLoadingBodyPart(true)
    const { data } = await supabase
      .from('workouts')
      .select('date, exercise_logs!inner(sets, exercises!inner(body_parts))')
      .eq('user', user)
      .order('date', { ascending: true })

    const byDate = {}
    const allParts = new Set()

    for (const workout of data ?? []) {
      const date = workout.date
      if (!byDate[date]) byDate[date] = { date }
      for (const log of workout.exercise_logs ?? []) {
        const vol = (log.sets ?? []).reduce((acc, s) => acc + s.reps * s.weight, 0)
        for (const bp of log.exercises?.body_parts ?? []) {
          allParts.add(bp)
          byDate[date][bp] = (byDate[date][bp] ?? 0) + vol
        }
      }
    }

    const keys = [...allParts].sort()
    setBodyPartKeys(keys)
    setBodyPartData(
      Object.values(byDate).map(d => ({
        ...d,
        date: shortDate(d.date),
      }))
    )
    setLoadingBodyPart(false)
  }

  const canonicMeasure = selectedExercise?.canonic_measure ?? ''

  const BODY_PART_COLORS = [
    '#6c63ff', '#fb923c', '#22c55e', '#f59e0b', '#ec4899',
    '#14b8a6', '#a78bfa', '#f87171', '#34d399', '#60a5fa',
  ]

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Progress</h1>

      {/* User toggle */}
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

      {/* Exercise selector */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Per-Exercise</h2>
        <select
          className={styles.select}
          value={selectedExercise?.id ?? ''}
          onChange={e => {
            const ex = exercises.find(x => x.id === e.target.value) ?? null
            setSelectedExercise(ex)
          }}
        >
          <option value="">— Select exercise —</option>
          {exercises.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>

        {selectedExercise && !loadingExercise && (
          <>
            <div className={styles.chartBlock}>
              <p className={styles.chartLabel}>Max weight per session ({canonicMeasure})</p>
              {exerciseData.length === 0
                ? <EmptyChart label="No data yet for this exercise" />
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={exerciseData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip unit={canonicMeasure} />} />
                      <Line type="monotone" dataKey="Max Weight" stroke="#6c63ff" strokeWidth={2} dot={{ r: 4, fill: '#6c63ff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )
              }
            </div>

            <div className={styles.chartBlock}>
              <p className={styles.chartLabel}>Total volume per session ({canonicMeasure})</p>
              {exerciseData.length === 0
                ? <EmptyChart label="No data yet for this exercise" />
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={exerciseData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip unit={canonicMeasure} />} />
                      <Bar dataKey="Total Volume" fill="#6c63ff" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>
          </>
        )}

        {selectedExercise && loadingExercise && (
          <p className={styles.muted}>Loading…</p>
        )}

        {!selectedExercise && (
          <p className={styles.muted}>Select an exercise to see its progression</p>
        )}
      </div>

      {/* Body part volume */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Volume by body part</h2>
        {loadingBodyPart && <p className={styles.muted}>Loading…</p>}
        {!loadingBodyPart && bodyPartData.length === 0 && (
          <EmptyChart label="No workout data yet" />
        )}
        {!loadingBodyPart && bodyPartData.length > 0 && (
          <div className={styles.chartBlock}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bodyPartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#888' }} />
                {bodyPartKeys.map((bp, i) => (
                  <Bar
                    key={bp}
                    dataKey={bp}
                    fill={BODY_PART_COLORS[i % BODY_PART_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
