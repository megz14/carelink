interface Reading {
  systolic: number
  diastolic: number
  timestamp: string
}

interface LatestBPProps {
  readings: Reading[]
}

function LatestBP({ readings }: LatestBPProps) {
  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5>Latest Blood Pressure</h5>
        {readings.length > 0 ? (
          <>
            <p className="fs-4">
              {readings[0].systolic}/{readings[0].diastolic} mmHg
            </p>
            <p className="text-muted small">Last updated: {readings[0].timestamp}</p>
          </>
        ) : (
          <p>No readings yet.</p>
        )}
      </div>
    </div>
  )
}

export default LatestBP


