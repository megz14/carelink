import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import PatientDashboard from './pages/PatientDashboard'
import PharmLogin from './pages/PharmLogin'
import PharmDashboard from './pages/PharmDashboard'
import PharmPatientView from './pages/PharmPatientView'
import Navbar from './components/Navbar'

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container my-3">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/patient/:patientId" element={<PatientDashboard />} />
          <Route path="/pharm/login" element={<PharmLogin />} />
          <Route path="/pharm/dashboard" element={<PharmDashboard />} />
          <Route path="/pharm/patient/:patientId" element={<PharmPatientView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
