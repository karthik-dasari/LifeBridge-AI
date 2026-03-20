export default function HospitalCard({ match, onAlert, alertSent, isRouteSelected, onShowRoute }) {
  const { hospital, match_score, distance_km, match_type } = match

  const matchBadge = {
    exact: { label: '✅ Best Match', color: 'bg-green-100 text-green-800' },
    partial: { label: '🔶 Partial Match', color: 'bg-yellow-100 text-yellow-800' },
    nearest: { label: '📍 Nearest', color: 'bg-blue-100 text-blue-800' },
  }

  const badge = matchBadge[match_type] || matchBadge.nearest

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{hospital.name}</h3>
          <p className="text-sm text-gray-500">{distance_km} km away</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Match score bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Match Score</span>
          <span className="font-semibold">{match_score}/100</span>
        </div>
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              match_score >= 70 ? 'bg-green-500' : match_score >= 40 ? 'bg-yellow-500' : 'bg-red-400'
            }`}
            style={{ width: `${match_score}%` }}
          />
        </div>
      </div>

      {/* Facilities */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">Facilities</p>
        <div className="flex flex-wrap gap-1">
          {hospital.facilities.map((f) => (
            <span key={f} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="flex gap-4 text-sm text-gray-600 mb-4">
        <span>🛏️ ICU: <strong>{hospital.availability.icu_beds}</strong></span>
        <span>🚑 Emergency: <strong>{hospital.availability.emergency_slots}</strong></span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onShowRoute(isRouteSelected ? null : hospital.id)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            isRouteSelected
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {isRouteSelected ? '✅ Route Shown' : '🗺️ Show Route'}
        </button>
        <button
          onClick={() => onAlert(hospital.id)}
          disabled={alertSent}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            alertSent
              ? 'bg-green-100 text-green-800 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {alertSent ? '✅ Alert Sent' : '🔔 Alert Hospital'}
        </button>
      </div>
    </div>
  )
}
