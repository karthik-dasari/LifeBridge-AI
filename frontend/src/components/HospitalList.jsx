import HospitalCard from './HospitalCard'

export default function HospitalList({ matches, onAlert, alertedHospitals, selectedHospitalId, onShowRoute }) {
  if (!matches || matches.length === 0) return null

  return (
    <section className="space-y-4" aria-label="Recommended hospitals">
      <h2 className="text-lg font-semibold text-gray-800">
        <span aria-hidden="true">🏥</span> Recommended Hospitals ({matches.length})
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {matches.map((match) => (
          <HospitalCard
            key={match.hospital.id}
            match={match}
            onAlert={onAlert}
            alertSent={alertedHospitals.has(match.hospital.id)}
            isRouteSelected={selectedHospitalId === match.hospital.id}
            onShowRoute={onShowRoute}
          />
        ))}
      </div>
    </section>
  )
}
