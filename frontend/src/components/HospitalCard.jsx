export default function HospitalCard({ match, onAlert, alertSent, isRouteSelected, onShowRoute }) {
  const { hospital, match_score, distance_km, match_type } = match

  const matchBadge = {
    exact: { label: 'Best Match', color: 'bg-green-100 text-green-800' },
    partial: { label: 'Partial Match', color: 'bg-yellow-100 text-yellow-800' },
    nearest: { label: 'Nearest', color: 'bg-blue-100 text-blue-800' },
  }

  const badge = matchBadge[match_type] || matchBadge.nearest

  return (
    <article className="bg-white rounded-xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow" aria-label={`${hospital.name} - ${distance_km} km away`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{hospital.name}</h3>
          <p className="text-sm text-gray-600">{distance_km} km away</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Match score bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-700 mb-1">
          <span>Match Score</span>
          <span className="font-semibold">{match_score}/100</span>
        </div>
        <progress
          className="w-full h-2 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full"
          value={match_score}
          max={100}
          aria-label={`Match score: ${match_score} out of 100`}
          style={{
            '--progress-color': match_score >= 70 ? '#22c55e' : match_score >= 40 ? '#eab308' : '#f87171',
          }}
        >
          {match_score}/100
        </progress>
      </div>

      {/* Facilities */}
      <div className="mb-3">
        <p className="text-xs text-gray-700 mb-1">Facilities</p>
        <ul className="flex flex-wrap gap-1 list-none" aria-label="Hospital facilities">
          {hospital.facilities.map((f) => (
            <li key={f} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Availability */}
      <div className="flex gap-4 text-sm text-gray-600 mb-4">
        <span><span aria-hidden="true">🛏️</span> ICU: <strong>{hospital.availability.icu_beds}</strong></span>
        <span><span aria-hidden="true">🚑</span> Emergency: <strong>{hospital.availability.emergency_slots}</strong></span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onShowRoute(isRouteSelected ? null : hospital.id)}
          aria-label={isRouteSelected ? `Hide route to ${hospital.name}` : `Show route to ${hospital.name}`}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            isRouteSelected
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {isRouteSelected ? (<><span aria-hidden="true">✅</span> Route Shown</>) : (<><span aria-hidden="true">🗺️</span> Show Route</>)}
        </button>
        <button
          onClick={() => onAlert(hospital.id)}
          disabled={alertSent}
          aria-label={alertSent ? `Alert already sent to ${hospital.name}` : `Send alert to ${hospital.name}`}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            alertSent
              ? 'bg-green-100 text-green-800 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {alertSent ? (<><span aria-hidden="true">✅</span> Alert Sent</>) : (<><span aria-hidden="true">🔔</span> Alert Hospital</>)}
        </button>
      </div>
    </article>
  )
}
