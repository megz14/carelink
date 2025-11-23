import { useState } from 'react'
import api from '../api/client'

interface BPFormProps {
  patientId: string
  onSuccess: () => void
}

function BPForm({ patientId, onSuccess }: BPFormProps) {
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post(`/patient/${patientId}/bp`, {
        systolic,
        diastolic,
        heart_rate: heartRate || null,
      })
      setSystolic('')
      setDiastolic('')
      setHeartRate('')
      onSuccess()
    } catch (error) {
      console.error('Error adding BP:', error)
      alert('Failed to add blood pressure reading')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5>Add Blood Pressure</h5>
        <form onSubmit={handleSubmit} className="row g-2">
          <div className="col-4">
            <input
              className="form-control"
              placeholder="Systolic"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              required
            />
          </div>
          <div className="col-4">
            <input
              className="form-control"
              placeholder="Diastolic"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              required
            />
          </div>
          <div className="col-4">
            <input
              className="form-control"
              placeholder="Heart rate (optional)"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
            />
          </div>
          <div className="col-12 mt-2">
            <button className="btn btn-success" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save BP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BPForm

