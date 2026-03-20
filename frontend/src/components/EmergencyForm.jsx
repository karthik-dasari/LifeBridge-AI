import { useState, useEffect } from 'react'

export default function EmergencyForm({ onAnalyze, loading }) {
  const [inputText, setInputText] = useState('')
  const [location, setLocation] = useState('')
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  const [inputMode, setInputMode] = useState('text') // 'text' or 'voice'

  useEffect(() => {
    detectLocation()
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser')
      return
    }
    setLocating(true)
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`)
        setLocating(false)
      },
      () => {
        setLocError('Unable to get location. You can enter it manually.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return
    const payload = { input_text: inputText, location: location || 'Hyderabad' }
    if (coords) {
      payload.lat = coords.lat
      payload.lng = coords.lng
    }
    onAnalyze(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-4" aria-label="Emergency description form">
      <h2 className="text-lg font-semibold text-gray-800">Describe Your Emergency</h2>

      {/* Input mode toggle */}
      <fieldset>
        <legend className="sr-only">Input method</legend>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInputMode('text')}
            aria-pressed={inputMode === 'text'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'text'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span aria-hidden="true">✏️</span> Text Input
          </button>
          <button
            type="button"
            onClick={() => setInputMode('voice')}
            aria-pressed={inputMode === 'voice'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'voice'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span aria-hidden="true">🎤</span> Voice (Simulated)
          </button>
        </div>
      </fieldset>

      {/* Emergency input */}
      <div>
        <label htmlFor="emergency-input" className="block text-sm font-medium text-gray-700 mb-1">
          {inputMode === 'voice' ? 'Voice Transcript' : 'Emergency Description'}
        </label>
        <textarea
          id="emergency-input"
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          required
          aria-required="true"
          placeholder={
            inputMode === 'voice'
              ? 'Paste or type voice transcript here...'
              : 'e.g., My father has chest pain and sweating'
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location-input" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <div className="flex gap-2">
          <input
            id="location-input"
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value)
              setCoords(null)
            }}
            placeholder="e.g., Hyderabad (default)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={detectLocation}
            disabled={locating}
            aria-label={locating ? 'Detecting GPS location' : 'Use GPS to detect location'}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
          >
            {locating ? (<><span aria-hidden="true">⏳</span> Detecting...</>) : (<><span aria-hidden="true">📍</span> Use GPS</>)}
          </button>
        </div>
        {coords && (
          <output className="text-xs text-green-600 mt-1 block">
            <span aria-hidden="true">📍</span> GPS location detected ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
          </output>
        )}
        {locError && <p className="text-xs text-amber-600 mt-1" role="alert">{locError}</p>}
      </div>

      <button
        type="submit"
        disabled={loading || !inputText.trim()}
        aria-busy={loading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin" aria-hidden="true">⏳</span> Analyzing...
          </>
        ) : (
          <><span aria-hidden="true">🚨</span> Analyze Emergency</>
        )}
      </button>
    </form>
  )
}
