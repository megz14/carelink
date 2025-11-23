import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="text-center my-4">
      <h1>CareLink Demo</h1>
      <p className="text-muted">Choose a demo view:</p>

      <div className="d-flex justify-content-center gap-3 mt-3">
        <Link to="/patient/P001" className="btn btn-primary">
          Patient view (P001)
        </Link>
        <Link to="/pharm/login" className="btn btn-outline-secondary">
          Pharmacist view
        </Link>
      </div>
    </div>
  )
}

export default Home

