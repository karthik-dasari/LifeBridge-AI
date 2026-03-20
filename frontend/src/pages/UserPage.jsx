import { useState, useEffect, useRef } from 'react'
import { analyzeEmergency, matchHospitals, alertHospital, updateLiveLocation } from '../api'
import EmergencyForm from '../components/EmergencyForm'
import AnalysisResult from '../components/AnalysisResult'
import HospitalList from '../components/HospitalList'
import MapView from '../components/MapView'

export default function UserPage() {
  const [analysis, setAnalysis] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [matching, setMatching] = useState(false)
  const [alertedHospitals, setAlertedHospitals] = useState(new Set())
  const [error, setError] = useState('')
  const [userCoords, setUserCoords] = useState(null)
  const [selectedHospitalId, setSelectedHospitalId] = useState(null)
  const [activeAlertId, setActiveAlertId] = useState(null)
  const locationWatchRef = useRef(null)

  const handleAnalyze = async (data) => {
    setError('')
    setAnalysis(null)
    setMatches([])
    setAlertedHospitals(new Set())
    setSelectedHospitalId(null)
    setLoading(true)

    // Store user coordinates for map
    if (data.lat != null && data.lng != null) {
      setUserCoords({ lat: data.lat, lng: data.lng })
    }

    try {
      const res = await analyzeEmergency(data)
      const result = res.data
      setAnalysis(result)

      // Auto-match hospitals
      setMatching(true)
      const matchPayload = {
        required_facilities: result.required_facilities,
        location: data.location,
        emergency_type: result.emergency_type,
        severity: result.severity,
      }
      if (data.lat != null && data.lng != null) {
        matchPayload.lat = data.lat
        matchPayload.lng = data.lng
      }
      const matchRes = await matchHospitals(matchPayload)
      setMatches(matchRes.data.matches)
    } catch (err) {
      setError('Failed to analyze emergency. Please check if the backend is running.')
    } finally {
      setLoading(false)
      setMatching(false)
    }
  }

  const handleAlert = async (hospitalId) => {
    if (!analysis) return
    try {
      const payload = {
        hospital_id: hospitalId,
        emergency: analysis.emergency_type,
        eta: '10 mins',
        requirements: analysis.required_facilities,
      }
      if (userCoords) {
        payload.user_lat = userCoords.lat
        payload.user_lng = userCoords.lng
      }
      const res = await alertHospital(payload)
      const alertId = res.data.alert_id
      setAlertedHospitals((prev) => new Set(prev).add(hospitalId))
      setActiveAlertId(alertId)

      // Start broadcasting live location for this alert
      startLocationBroadcast(alertId)
    } catch {
      setError('Failed to send alert.')
    }
  }

  const startLocationBroadcast = (alertId) => {
    // Stop any previous watch
    if (locationWatchRef.current != null) {
      navigator.geolocation.clearWatch(locationWatchRef.current)
    }
    if (!navigator.geolocation) return

    locationWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserCoords({ lat: latitude, lng: longitude })
        updateLiveLocation(alertId, latitude, longitude).catch(() => {})
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000 }
    )
  }

  // Cleanup location watch on unmount
  useEffect(() => {
    return () => {
      if (locationWatchRef.current != null) {
        navigator.geolocation.clearWatch(locationWatchRef.current)
      }
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-gray-900"><span aria-hidden="true">🚨</span> Emergency Response</h1>
        <p className="text-gray-600 mt-1">Describe your emergency and we&apos;ll find the best hospital</p>
      </div>

      <EmergencyForm onAnalyze={handleAnalyze} loading={loading} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm" role="alert">
          {error}
        </div>
      )}

      <AnalysisResult analysis={analysis} />

      {matching && (
        <output className="text-center text-gray-600 py-4 block" aria-live="polite">
          <span className="animate-spin inline-block mr-2" aria-hidden="true">⏳</span>
          Finding matching hospitals...
        </output>
      )}

      <HospitalList
        matches={matches}
        onAlert={handleAlert}
        alertedHospitals={alertedHospitals}
        selectedHospitalId={selectedHospitalId}
        onShowRoute={setSelectedHospitalId}
      />

      {matches.length > 0 && (
        <MapView
          userCoords={userCoords}
          matches={matches}
          selectedHospitalId={selectedHospitalId}
          onSelectHospital={setSelectedHospitalId}
        />
      )}
    </div>
  )
}
