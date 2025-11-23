import { useState } from 'react'
import api from '../api/client'

interface Medication {
  medication_id: number
  name: string
  dose: string
  frequency: string
}

interface MedicationListProps {
  patientId: string
  meds: Medication[]
  onUpdate: () => void
}

function MedicationList({ patientId, meds, onUpdate }: MedicationListProps) {
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [frequency, setFrequency] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post(`/patient/${patientId}/med`, {
        name,
        dose,
        frequency,
      })
      setName('')
      setDose('')
      setFrequency('')
      onUpdate()
    } catch (error) {
      console.error('Error adding medication:', error)
      alert('Failed to add medication')
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setScanResult(null)

    const formData = new FormData()
    formData.append('image', file)

    try {
      const response = await fetch(`/patient/${patientId}/scan_med`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const data = await response.json()
      if (data.suggested) {
        if (data.suggested.name) setName(data.suggested.name)
        if (data.suggested.dose) setDose(data.suggested.dose)
        if (data.suggested.frequency) setFrequency(data.suggested.frequency)
      }
      setScanResult(data)
    } catch (error) {
      console.error('Error scanning medication:', error)
      alert('Failed to scan medication label')
    } finally {
      setScanning(false)
    }
  }

  const fillMedName = (text: string) => {
    setName(text)
  }

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5>Your Medications</h5>
        <ul>
          {meds.map((m) => (
            <li key={m.medication_id}>
              {m.name} – {m.dose} – {m.frequency}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="row g-2">
          <div className="col-md-4">
            <input
              className="form-control"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="col-md-4">
            <input
              className="form-control"
              placeholder="Dose"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <input
              className="form-control"
              placeholder="Frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />
          </div>
          <div className="col-12 mt-2">
            <button className="btn btn-outline-primary btn-sm" type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Medication'}
            </button>
          </div>
        </form>

        <hr />
        <h6>Or scan medication label with AI</h6>
        <div className="mb-2">
          <input
            type="file"
            accept="image/*"
            className="form-control mb-2"
            onChange={handleScan}
            disabled={scanning}
          />
          {scanning && <p className="small text-muted">Scanning with AI...</p>}
        </div>
        {scanResult && scanResult.lines && (
          <div className="small text-muted">
            <div>Detected text (click to override medication name):</div>
            <ul>
              {scanResult.lines.map((line: string, idx: number) => (
                <li key={idx}>
                  <button
                    type="button"
                    className="btn btn-sm btn-link p-0"
                    onClick={() => fillMedName(line)}
                  >
                    {line}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default MedicationList

