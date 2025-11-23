import { useState, useEffect } from 'react'
import api from '../api/client'

interface Patient {
  patient_id: string
  conditions: string | null
}

interface ConditionsFormProps {
  patient: Patient
  onUpdate: () => void
}

function ConditionsForm({ patient, onUpdate }: ConditionsFormProps) {
  const conditions = (patient.conditions || '').split(',').filter(Boolean)
  const [selected, setSelected] = useState<string[]>(conditions)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSelected(conditions)
  }, [patient.conditions])

  const handleChange = (condition: string) => {
    setSelected((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post(`/patient/${patient.patient_id}/conditions`, {
        conditions: selected,
      })
      onUpdate()
    } catch (error) {
      console.error('Error updating conditions:', error)
      alert('Failed to update conditions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5>My conditions</h5>
        <form onSubmit={handleSubmit}>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="condHTN"
              checked={selected.includes('HTN')}
              onChange={() => handleChange('HTN')}
            />
            <label className="form-check-label" htmlFor="condHTN">
              Hypertension
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="condDM"
              checked={selected.includes('DM')}
              onChange={() => handleChange('DM')}
            />
            <label className="form-check-label" htmlFor="condDM">
              Diabetes
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="condDLD"
              checked={selected.includes('DLD')}
              onChange={() => handleChange('DLD')}
            />
            <label className="form-check-label" htmlFor="condDLD">
              Dyslipidemia
            </label>
          </div>
          <button
            className="btn btn-sm btn-outline-primary mt-2"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save conditions'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ConditionsForm



