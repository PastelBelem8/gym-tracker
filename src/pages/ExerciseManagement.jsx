import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import styles from './ExerciseManagement.module.css'

const TYPES = ['dumbbell', 'barbell', 'cable', 'machine', 'bodyweight']
const MEASURES = ['lbs', 'kg', 's', 'min']
const BODY_PARTS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'core', 'quads', 'hamstrings', 'glutes', 'calves', 'traps', 'lats', 'full body',
]

const TYPE_DEFAULTS = { barbell: 45, dumbbell: 0, cable: 0, machine: 0, bodyweight: 0 }

const emptyForm = () => ({
  name: '', type: 'dumbbell', body_parts: [], canonic_measure: 'lbs', urls: '', note: '', offset: 0,
})

export default function ExerciseManagement() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const fetchExercises = async () => {
    const { data } = await supabase.from('exercises').select('*').order('name')
    setExercises(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchExercises() }, [])

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  const openEdit = (ex) => {
    setEditId(ex.id)
    setForm({
      name: ex.name,
      type: ex.type,
      body_parts: ex.body_parts ?? [],
      canonic_measure: ex.canonic_measure,
      urls: (ex.urls ?? []).join('\n'),
      note: ex.note ?? '',
      offset: ex.offset ?? 0,
    })
    setShowForm(true)
  }

  const toggleBodyPart = (bp) => {
    setForm(f => ({
      ...f,
      body_parts: f.body_parts.includes(bp)
        ? f.body_parts.filter(b => b !== bp)
        : [...f.body_parts, bp],
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      type: form.type,
      body_parts: form.body_parts,
      canonic_measure: form.canonic_measure,
      urls: form.urls.split('\n').map(u => u.trim()).filter(Boolean),
      note: form.note.trim() || null,
      offset: Number(form.offset) || 0,
    }
    if (editId) {
      await supabase.from('exercises').update(payload).eq('id', editId)
    } else {
      await supabase.from('exercises').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    fetchExercises()
  }

  if (loading) return <p className={styles.muted}>Loading…</p>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Exercises</h1>
        <button className={styles.createBtn} onClick={openCreate}>+ New</button>
      </div>

      {exercises.length === 0 && !showForm && (
        <p className={styles.muted}>No exercises yet. Create your first one!</p>
      )}

      <div className={styles.list}>
        {exercises.map(ex => (
          <div key={ex.id} className={styles.card} onClick={() => openEdit(ex)}>
            <div className={styles.cardTop}>
              <span className={styles.cardName}>{ex.name}</span>
              <span className={styles.cardType}>{ex.type}</span>
            </div>
            <div className={styles.cardBottom}>
              {ex.body_parts?.map(bp => (
                <span key={bp} className={styles.tag}>{bp}</span>
              ))}
              <span className={styles.measure}>{ex.canonic_measure}</span>
              {ex.offset > 0 && <span className={styles.offset}>+{ex.offset} offset</span>}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editId ? 'Edit Exercise' : 'New Exercise'}</h2>
              <button className={styles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div className={styles.field}>
              <label>Name *</label>
              <input
                type="text"
                placeholder="e.g. Chest Press"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({
                    ...f,
                    type: e.target.value,
                    offset: TYPE_DEFAULTS[e.target.value] ?? 0,
                  }))}
                >
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Default unit</label>
                <select value={form.canonic_measure} onChange={e => setForm(f => ({ ...f, canonic_measure: e.target.value }))}>
                  {MEASURES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Offset ({form.canonic_measure})</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.offset}
                  onChange={e => setForm(f => ({ ...f, offset: e.target.value }))}
                  placeholder="e.g. 45 for barbell"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Body parts</label>
              <div className={styles.chipGrid}>
                {BODY_PARTS.map(bp => (
                  <button
                    key={bp}
                    type="button"
                    className={`${styles.chip} ${form.body_parts.includes(bp) ? styles.chipActive : ''}`}
                    onClick={() => toggleBodyPart(bp)}
                  >
                    {bp}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label>Reference URLs (one per line)</label>
              <textarea
                placeholder="https://..."
                value={form.urls}
                onChange={e => setForm(f => ({ ...f, urls: e.target.value }))}
                rows={3}
              />
            </div>

            <div className={styles.field}>
              <label>Note</label>
              <textarea
                placeholder="Optional notes"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                rows={2}
              />
            </div>

            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
            >
              {saving ? 'Saving…' : editId ? 'Update' : 'Create Exercise'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
