import { useState } from 'react'
import api from '../api/client'

interface Patient {
  patient_id: string
  consent: number
}

interface ConsentToggleProps {
  patient: Patient
  onUpdate: () => void
}

function ConsentToggle({ patient, onUpdate }: ConsentToggleProps) {
  const [consent, setConsent] = useState(patient.consent === 1)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post(`/patient/${patient.patient_id}/consent`, {
        consent: consent ? 'on' : '',
      })
      onUpdate()
    } catch (error) {
      console.error('Error updating consent:', error)
      alert('Failed to update consent')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5>Share data with pharmacist</h5>
        <form onSubmit={handleSubmit}>
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="consentSwitch"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="consentSwitch">
              Allow access to my data
            </label>
          </div>
          <button className="btn btn-sm btn-primary" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ConsentToggle
