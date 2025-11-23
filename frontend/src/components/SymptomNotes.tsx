import { useState } from 'react'
import api from '../api/client'

interface Symptom {
  symptom_id: number
  note: string
  timestamp: string
}

interface SymptomNotesProps {
  patientId: string
  symptoms: Symptom[]
  onUpdate: () => void
}

function SymptomNotes({ patientId, symptoms, onUpdate }: SymptomNotesProps) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return

    setLoading(true)
    try {
      await api.post(`/patient/${patientId}/symptom`, { note })
      setNote('')
      onUpdate()
    } catch (error) {
      console.error('Error adding symptom:', error)
      alert('Failed to add symptom note')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5>Symptom notes</h5>
        <form onSubmit={handleSubmit}>
          <textarea
            className="form-control mb-2"
            rows={2}
            placeholder="e.g., Headache + BP 160/100 tonight."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="btn btn-sm btn-outline-primary" type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add note'}
          </button>
        </form>
        {symptoms.length > 0 ? (
          <ul className="small mt-2 mb-0">
            {symptoms.map((s) => (
              <li key={s.symptom_id}>
                {s.timestamp} – {s.note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted small mb-0">No symptom notes yet.</p>
        )}
      </div>
    </div>
  )
}

export default SymptomNotes

