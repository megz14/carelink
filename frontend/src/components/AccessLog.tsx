interface Access {
  access_id: number
  timestamp: string
  actor: string
  role: string
}

interface AccessLogProps {
  accesses: Access[]
}

function AccessLog({ accesses }: AccessLogProps) {
  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5>Who accessed my record?</h5>
        {accesses.length > 0 ? (
          <ul className="small mb-0">
            {accesses.map((a) => (
              <li key={a.access_id}>
                {a.timestamp} – {a.actor} ({a.role})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted small mb-0">No recent access.</p>
        )}
      </div>
    </div>
  )
}

export default AccessLog



