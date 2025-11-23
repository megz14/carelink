import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav className="navbar navbar-light mb-3" style={{ backgroundColor: '#074DB1', borderBottom: '2px solid #2C7DD0' }}>
      <div className="container d-flex align-items-center">
        <Link to="/" className="navbar-brand d-flex align-items-center" style={{ color: '#FCFBFC', fontWeight: 600, textDecoration: 'none' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              marginRight: '14px',
              backgroundColor: '#FCFBFC', // White background
              borderRadius: '50%', // Fully round
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              border: '2px solid rgba(252, 251, 252, 0.8)',
            }}
          >
            <img 
              src="/logo.png" 
              alt="CareLink Logo" 
              style={{
                height: '32px',
                width: '32px',
                objectFit: 'contain',
                display: 'block',
              }}
              onError={(e) => {
                // Fallback if image doesn't load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          CareLink
        </Link>
        <span className="small ms-auto" style={{ color: 'rgba(252, 251, 252, 0.8)' }}>Demo MVP</span>
      </div>
    </nav>
  )
}

export default Navbar

