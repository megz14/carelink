import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'
import BPForm from '../components/BPForm'
import MedicationList from '../components/MedicationList'
import SymptomNotes from '../components/SymptomNotes'
import ConsentToggle from '../components/ConsentToggle'
import ConditionsForm from '../components/ConditionsForm'
import AccessLog from '../components/AccessLog'
import LatestBP from '../components/LatestBP'

interface Patient {
  patient_id: string
  name: string
  consent: number
  conditions: string | null
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

function PatientDashboard() {
  const { patientId } = useParams<{ patientId: string }>()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [readings, setReadings] = useState<Reading[]>([])
  const [meds, setMeds] = useState<Medication[]>([])
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [accesses, setAccesses] = useState<Access[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPatientData()
  }, [patientId])

  const fetchPatientData = async () => {
    try {
      const response = await api.get(`/patient/${patientId}`)
      const data = response.data
      console.log('Patient data:', data) // Debug log
      if (!data.patient) {
        console.error('Patient not found in response')
        return
      }
      setPatient(data.patient)
      setReadings(data.readings || [])
      setMeds(data.medications || [])
      setSymptoms(data.symptoms || [])
      setAccesses(data.accesses || [])
    } catch (error: any) {
      console.error('Error fetching patient data:', error)
      if (error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center">Loading...</div>
  }

  if (!patient) {
    return <div className="text-center">Patient not found</div>
  }

  return (
    <div>
      <h2>Hi, {patient.name} ({patient.patient_id})</h2>

      <div className="row my-3">
        <div className="col-md-4">
          <LatestBP readings={readings} />
          <ConsentToggle patient={patient} onUpdate={fetchPatientData} />
          <ConditionsForm patient={patient} onUpdate={fetchPatientData} />
          <AccessLog accesses={accesses} />
        </div>

        <div className="col-md-8">
          <BPForm patientId={patientId!} onSuccess={fetchPatientData} />
          <MedicationList 
            patientId={patientId!} 
            meds={meds} 
            onUpdate={fetchPatientData} 
          />
          <SymptomNotes 
            patientId={patientId!} 
            symptoms={symptoms} 
            onUpdate={fetchPatientData} 
          />
        </div>
      </div>
    </div>
  )
}

export default PatientDashboard

