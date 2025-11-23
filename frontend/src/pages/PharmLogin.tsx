import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

function PharmLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Attempting login with:', { username, password })
      console.log('API base URL:', api.defaults.baseURL)
      const fullUrl = `${api.defaults.baseURL}/pharm/login`
      console.log('Full URL will be:', fullUrl)
      const response = await api.post('/pharm/login', { username, password })
      console.log('Login response:', response.data) // Debug log
      if (response.data.ok || response.status === 200) {
        navigate('/pharm/dashboard')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      if (error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
        alert(error.response.data?.error || 'Invalid credentials')
      } else {
        alert('Network error. Please check if Flask server is running.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-4">
        <h2>Pharmacist Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="pharm01"
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="test123"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PharmLogin


