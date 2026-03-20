import { useState, useEffect, useRef, useCallback } from 'react'
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
  const analysisRef = useRef(null)
  const userCoordsRef = useRef(null)

  // Keep refs in sync for stable callbacks
  useEffect(() => { analysisRef.current = analysis }, [analysis])
  useEffect(() => { userCoordsRef.current = userCoords }, [userCoords])

  const startLocationBroadcast = useCallback((alertId) => {
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
  }, [])

  const handleAnalyze = useCallback(async (data) => {
    setError('')
    setAnalysis(null)
    setMatches([])
    setAlertedHospitals(new Set())
    setSelectedHospitalId(null)
    setLoading(true)

    if (data.lat != null && data.lng != null) {
      setUserCoords({ lat: data.lat, lng: data.lng })
    }

    try {
      const res = await analyzeEmergency(data)
      const result = res.data
      setAnalysis(result)

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
  }, [])

  const handleAlert = useCallback(async (hospitalId) => {
    if (!analysisRef.current) return
    try {
      const payload = {
        hospital_id: hospitalId,
        emergency: analysisRef.current.emergency_type,
        eta: '10 mins',
        requirements: analysisRef.current.required_facilities,
      }
      if (userCoordsRef.current) {
        payload.user_lat = userCoordsRef.current.lat
        payload.user_lng = userCoordsRef.current.lng
      }
      const res = await alertHospital(payload)
      const alertId = res.data.alert_id
      setAlertedHospitals((prev) => new Set(prev).add(hospitalId))
      setActiveAlertId(alertId)

      startLocationBroadcast(alertId)
    } catch {
      setError('Failed to send alert.')
    }
  }, [startLocationBroadcast])

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
