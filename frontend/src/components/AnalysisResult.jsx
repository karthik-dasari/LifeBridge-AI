const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-green-100 text-green-800 border-green-300',
}

export default function AnalysisResult({ analysis }) {
  if (!analysis) return null

  const severityClass = SEVERITY_COLORS[analysis.severity] || SEVERITY_COLORS.moderate
  const confidencePercent = (analysis.confidence_score * 100).toFixed(0)

  return (
    <section className="bg-white rounded-xl shadow-md p-6 space-y-4" aria-label="AI Analysis Results">
      <h2 className="text-lg font-semibold text-gray-800"><span aria-hidden="true">🧠</span> AI Analysis</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide" id="emergency-type-label">Emergency Type</p>
          <p className="text-lg font-bold text-gray-900 capitalize" aria-labelledby="emergency-type-label">{analysis.emergency_type}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide" id="severity-label">Severity</p>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${severityClass}`} aria-labelledby="severity-label">
            {analysis.severity.toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide" id="confidence-label">Confidence</p>
          <div className="flex items-center gap-2">
            <progress
              className="flex-1 h-2 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-indigo-600 [&::-moz-progress-bar]:bg-indigo-600"
              value={confidencePercent}
              max={100}
              aria-label={`Confidence score: ${confidencePercent}%`}
            >
              {confidencePercent}%
            </progress>
            <span className="text-sm font-medium text-gray-700">
              {confidencePercent}%
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Required Facilities</p>
          <ul className="flex flex-wrap gap-1 mt-1 list-none" aria-label="Required facilities">
            {analysis.required_facilities.map((f) => (
              <li key={f} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
