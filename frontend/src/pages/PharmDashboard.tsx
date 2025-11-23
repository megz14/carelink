import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

interface Patient {
  patient_id: string
  name: string
  consent: number
}

function PharmDashboard() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      const response = await api.get('/pharm/dashboard')
      setPatients(response.data.patients || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
      if ((error as any).response?.status === 401) {
        window.location.href = '/pharm/login'
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center">Loading...</div>
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Pharmacist Dashboard</h2>
        <Link to="/pharm/login" className="btn btn-sm btn-outline-secondary">
          Logout
        </Link>
      </div>

      <ul>
        {patients.map((patient) => (
          <li key={patient.patient_id}>
            <Link to={`/pharm/patient/${patient.patient_id}`}>
              {patient.name} ({patient.patient_id})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default PharmDashboard



