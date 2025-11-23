import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import api from '../api/client'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface Patient {
  patient_id: string
  name: string
  conditions: string | null
  care_plan: string | null
}

interface Reading {
  systolic: number
  diastolic: number
  timestamp: string
}

interface Medication {
  medication_id: number
  name: string
  dose: string
  frequency: string
}

interface Symptom {
  symptom_id: number
  note: string
  timestamp: string
}

interface Access {
  access_id: number
  timestamp: string
  actor: string
  role: string
}

function PharmPatientView() {
  const { patientId } = useParams<{ patientId: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [carePlan, setCarePlan] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPatientData()
  }, [patientId])

  const fetchPatientData = async () => {
    try {
      const response = await api.get(`/pharm/patient/${patientId}`)
      setData(response.data)
      setCarePlan(response.data.patient?.care_plan || '')
    } catch (error: any) {
      console.error('Error fetching patient data:', error)
      if (error.response?.status === 401) {
        window.location.href = '/pharm/login'
      } else if (error.response?.status === 403) {
        // Patient has no consent - set data to show error message
        setData({
          error: 'No consent',
          message: error.response.data?.message || 'Patient has not given consent to share data',
          patient: error.response.data?.patient || null
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMarkReview = async () => {
    try {
      await api.post(`/pharm/patient/${patientId}/mark_review`)
      fetchPatientData()
    } catch (error) {
      console.error('Error marking review:', error)
      alert('Failed to mark review')
    }
  }

  const handleSaveCarePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/pharm/patient/${patientId}/care_plan`, { care_plan: carePlan })
      fetchPatientData()
    } catch (error) {
      console.error('Error saving care plan:', error)
      alert('Failed to save care plan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center">Loading...</div>
  }

  if (!data || !data.patient) {
    return <div className="text-center">Patient not found</div>
  }

  // Handle no consent case
  if (data.error === 'No consent') {
    return (
      <div>
        <h2>Patient: {data.patient?.name} ({data.patient?.patient_id})</h2>
        <div className="alert alert-warning mt-3">
          <h5>No Consent</h5>
          <p>{data.message || 'This patient has not given consent to share their data with pharmacists.'}</p>
          <p className="mb-0 small text-muted">
            The patient needs to enable consent from their dashboard first.
          </p>
        </div>
      </div>
    )
  }

  const { patient, readings, meds, symptoms, accesses, labels, systolic, diastolic, avg_sys, mtm_level, mtm_score, bp_status, bp_status_class, review_due } = data

  const chartData = {
    labels: labels || [],
    datasets: [
      {
        label: 'Systolic',
        data: systolic || [],
        borderColor: '#074DB1', // sapphire
        backgroundColor: 'rgba(7, 77, 177, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Diastolic',
        data: diastolic || [],
        borderColor: '#2C7DD0', // steel blue
        backgroundColor: 'rgba(44, 125, 208, 0.2)',
        tension: 0.4,
      },
    ],
  }

  const conditions = (patient.conditions || '').split(',').filter(Boolean)

  return (
    <div>
      <h2>Patient: {patient.name} ({patient.patient_id})</h2>

      {conditions.length > 0 && (
        <div className="mb-3">
          {conditions.map((c: string) => (
            <span
              key={c}
              className={`badge me-1 ${
                c === 'HTN'
                  ? 'bg-danger'
                  : c === 'DM'
                  ? 'bg-warning text-dark'
                  : 'bg-primary'
              }`}
            >
              {c === 'HTN' ? 'Hypertension' : c === 'DM' ? 'Diabetes' : 'Dyslipidemia'}
            </span>
          ))}
        </div>
      )}

      {review_due && (
        <div className="alert alert-warning">
          Medication review is due (≥5 active meds and last review ≥ 6 months ago or not done).
          <button
            className="btn btn-sm btn-outline-dark ms-2"
            onClick={handleMarkReview}
          >
            Mark as reviewed
          </button>
        </div>
      )}

      {bp_status && (
        <div className={`alert alert-${bp_status_class}`}>
          BP control: {bp_status}
        </div>
      )}

      <div className="alert alert-info">
        MTM Risk: {mtm_level} (score: {mtm_score})
      </div>

      <div className="row my-3">
        <div className="col-md-6">
          <h5>BP Trend</h5>
          {readings.length > 0 ? (
            <Line data={chartData} />
          ) : (
            <p className="text-muted">No BP readings yet.</p>
          )}
        </div>
        <div className="col-md-6">
          <h5>Medications</h5>
          <ul>
            {meds.map((m: Medication) => (
              <li key={m.medication_id}>
                {m.name} – {m.dose} – {m.frequency}
              </li>
            ))}
          </ul>
          {avg_sys && (
            <p className="mt-2 text-muted small">
              Average systolic: {avg_sys.toFixed(1)} mmHg
            </p>
          )}
        </div>
      </div>

      <div className="row my-3">
        <div className="col-md-6">
          <h5>Recent Symptom Notes</h5>
          {symptoms.length > 0 ? (
            <ul className="small">
              {symptoms.map((s: Symptom) => (
                <li key={s.symptom_id}>
                  {s.timestamp} – {s.note}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted small">No symptom notes yet.</p>
          )}

          <h6 className="mt-3">Access log (audit trail)</h6>
          {accesses.length > 0 ? (
            <ul className="small">
              {accesses.map((a: Access) => (
                <li key={a.access_id}>
                  {a.timestamp} – {a.actor} ({a.role}) viewed record
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted small">No access recorded.</p>
          )}
        </div>

        <div className="col-md-6">
          <h5>Care Plan</h5>
          <form onSubmit={handleSaveCarePlan}>
            <textarea
              className="form-control"
              rows={5}
              placeholder="e.g., Recheck BP in 2 weeks, reinforce low-sodium diet."
              value={carePlan}
              onChange={(e) => setCarePlan(e.target.value)}
            />
            <button className="btn btn-sm btn-primary mt-2" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save care plan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PharmPatientView

