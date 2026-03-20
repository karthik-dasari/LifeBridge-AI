const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-green-100 text-green-800 border-green-300',
}

export default function AnalysisResult({ analysis }) {
  if (!analysis) return null

  const severityClass = SEVERITY_COLORS[analysis.severity] || SEVERITY_COLORS.moderate

  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">🧠 AI Analysis</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Emergency Type</p>
          <p className="text-lg font-bold text-gray-900 capitalize">{analysis.emergency_type}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Severity</p>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${severityClass}`}>
            {analysis.severity.toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Confidence</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${(analysis.confidence_score * 100).toFixed(0)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {(analysis.confidence_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Required Facilities</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {analysis.required_facilities.map((f) => (
              <span key={f} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
