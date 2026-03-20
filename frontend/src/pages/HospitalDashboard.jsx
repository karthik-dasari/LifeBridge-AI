import { useState, useEffect, useRef, useCallback } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  DirectionsRenderer,
} from '@react-google-maps/api'
import apiClient, { getHospitals } from '../api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const LIBRARIES = ['places']
const MAP_STYLE = { width: '100%', height: '400px', borderRadius: '12px' }

export default function HospitalDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [hospitals, setHospitals] = useState([])
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Live location tracking
  const [trackedAlertId, setTrackedAlertId] = useState(null)
  const [liveUserPos, setLiveUserPos] = useState(null)
  const [directions, setDirections] = useState(null)
  const [mapInfoOpen, setMapInfoOpen] = useState(null)
  const pollRef = useRef(null)
  const alertPollRef = useRef(null)
  const mapRef = useRef(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  })

  useEffect(() => {
    if (!user) {
      navigate('/hospital/auth')
      return
    }
    fetchHospitals()
  }, [user])

  // Poll alerts every 5 seconds when a hospital is selected
  useEffect(() => {
    if (!selectedHospital) return
    fetchAlerts(selectedHospital.id)
    alertPollRef.current = setInterval(() => fetchAlerts(selectedHospital.id), 5000)
    return () => clearInterval(alertPollRef.current)
  }, [selectedHospital])

  // Cleanup polls on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (alertPollRef.current) clearInterval(alertPollRef.current)
    }
  }, [])

  const fetchHospitals = async () => {
    try {
      const res = await getHospitals()
      setHospitals(res.data)
    } catch {
      setError('Failed to load hospitals.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAlerts = async (hospitalId) => {
    try {
      const res = await apiClient.get(`/alerts/${hospitalId}`)
      setAlerts(res.data)
    } catch {
      // silent fail for polling
    }
  }

  const selectHospital = (hospital) => {
    setSelectedHospital(hospital)
    stopTracking()
  }

  // --- Live location tracking ---
  const startTracking = (alertId) => {
    setTrackedAlertId(alertId)
    setLiveUserPos(null)
    setDirections(null)
    pollLiveLocation(alertId)
    pollRef.current = setInterval(() => pollLiveLocation(alertId), 3000)
  }

  const stopTracking = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
    setTrackedAlertId(null)
    setLiveUserPos(null)
    setDirections(null)
  }

  const pollLiveLocation = async (alertId) => {
    try {
      const res = await apiClient.get(`/live-location/${alertId}`)
      if (res.data.lat != null && res.data.lng != null) {
        const pos = { lat: res.data.lat, lng: res.data.lng }
        setLiveUserPos(pos)
        // Fetch route from user to hospital
        if (isLoaded && selectedHospital) {
          const directionsService = new window.google.maps.DirectionsService()
          directionsService.route(
            {
              origin: new window.google.maps.LatLng(pos.lat, pos.lng),
              destination: new window.google.maps.LatLng(
                selectedHospital.location.lat,
                selectedHospital.location.lng
              ),
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === 'OK') setDirections(result)
            }
          )
        }
      }
    } catch {
      // silent
    }
  }

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/hospital/auth')
  }

  if (!user) return null

  if (loading) {
    return (
      <output className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-500 block">
        Loading hospitals...
      </output>
    )
  }

  const trackedAlert = alerts.find((a) => (a.id || a.alert_id) === trackedAlertId)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900"><span aria-hidden="true">🏥</span> Hospital Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Logged in as {user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          aria-label="Logout from hospital dashboard"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          <span aria-hidden="true">🚪</span> Logout
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Hospital List */}
        <div className="md:col-span-1 space-y-3">
          <h2 className="text-lg font-semibold text-gray-700">Registered Hospitals</h2>
          {hospitals.map((h) => (
            <button
              key={h.id}
              onClick={() => selectHospital(h)}
              aria-pressed={selectedHospital?.id === h.id}
              aria-label={`Select ${h.name}`}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedHospital?.id === h.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
              }`}
            >
              <h3 className="font-semibold text-gray-900">{h.name}</h3>
              <p className="text-xs text-gray-600 mt-1">
                <span aria-hidden="true">📍</span> {h.location.lat.toFixed(4)}, {h.location.lng.toFixed(4)}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {h.facilities.slice(0, 3).map((f) => (
                  <span key={f} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                    {f}
                  </span>
                ))}
                {h.facilities.length > 3 && (
                  <span className="text-xs text-gray-600">+{h.facilities.length - 3}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="md:col-span-2 space-y-6">
          {selectedHospital ? (
            <>
              {/* Hospital Info */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedHospital.name}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-700 uppercase tracking-wide">Location</p>
                    <p className="text-sm text-gray-700">
                      {selectedHospital.location.lat.toFixed(4)}, {selectedHospital.location.lng.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-700 uppercase tracking-wide">Availability</p>
                    <p className="text-sm text-gray-700">
                      <span aria-hidden="true">🛏️</span> ICU: <strong>{selectedHospital.availability.icu_beds}</strong> &nbsp;|&nbsp;
                      <span aria-hidden="true">🚑</span> Emergency: <strong>{selectedHospital.availability.emergency_slots}</strong>
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-gray-700 uppercase tracking-wide mb-2">Facilities</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedHospital.facilities.map((f) => (
                      <span key={f} className="bg-indigo-50 text-indigo-700 text-sm px-3 py-1 rounded-full">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Incoming Alerts */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    <span aria-hidden="true">🔔</span> Incoming Alerts {alerts.length > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full" aria-label={`${alerts.length} active alerts`}>
                        {alerts.length}
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-gray-600">Auto-refreshes every 5s</span>
                </div>
                {alerts.length === 0 ? (
                  <p className="text-sm text-gray-500">No incoming alerts.</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert, idx) => {
                      const alertId = alert.id || alert.alert_id || `alert-${idx}`
                      const isTracking = trackedAlertId === alertId
                      return (
                        <div
                          key={alertId}
                          className={`border rounded-lg p-4 ${
                            isTracking
                              ? 'border-green-400 bg-green-50'
                              : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-red-800 capitalize">
                                <span aria-hidden="true">🚨</span> {alert.emergency_type} Emergency
                              </p>
                              <p className="text-sm text-gray-600 mt-1">ETA: {alert.eta}</p>
                              {alert.user_lat != null && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <span aria-hidden="true">📍</span> User at: {alert.user_lat?.toFixed(4)}, {alert.user_lng?.toFixed(4)}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(alert.requirements || []).map((r) => (
                                  <span key={r} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-gray-600">{alert.timestamp}</span>
                              <button
                                onClick={() => isTracking ? stopTracking() : startTracking(alertId)}
                                aria-label={isTracking ? 'Stop tracking this alert' : 'Track user location live'}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                  isTracking
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {isTracking ? (<><span aria-hidden="true">⏹</span> Stop Tracking</>) : (<><span aria-hidden="true">📍</span> Track Live</>)}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Live Location Map */}
              {trackedAlertId && isLoaded && (
                <section className="bg-white rounded-xl shadow-md p-4 space-y-3" aria-label="Live user location tracking">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">
                      <span aria-hidden="true">📡</span> Live User Location
                    </h3>
                    {liveUserPos && (
                      <output className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <span aria-hidden="true">🟢</span> Tracking {trackedAlert?.emergency_type || 'emergency'}
                      </output>
                    )}
                  </div>

                  {!liveUserPos && (
                    <p className="text-sm text-gray-600">Waiting for user location data...</p>
                  )}

                  <GoogleMap
                    mapContainerStyle={MAP_STYLE}
                    center={liveUserPos || {
                      lat: selectedHospital.location.lat,
                      lng: selectedHospital.location.lng,
                    }}
                    zoom={13}
                    onLoad={onMapLoad}
                    options={{
                      zoomControl: true,
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: true,
                    }}
                  >
                    {/* Hospital marker */}
                    <Marker
                      position={{
                        lat: selectedHospital.location.lat,
                        lng: selectedHospital.location.lng,
                      }}
                      icon={{
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">
                            <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="#059669"/>
                            <text x="16" y="20" text-anchor="middle" font-size="14" fill="white">H</text>
                          </svg>`
                        ),
                        scaledSize: isLoaded ? new window.google.maps.Size(32, 40) : undefined,
                        anchor: isLoaded ? new window.google.maps.Point(16, 40) : undefined,
                      }}
                      onClick={() => setMapInfoOpen('hospital')}
                    />
                    {mapInfoOpen === 'hospital' && (
                      <InfoWindow
                        position={{
                          lat: selectedHospital.location.lat,
                          lng: selectedHospital.location.lng,
                        }}
                        onCloseClick={() => setMapInfoOpen(null)}
                      >
                        <div className="text-sm">
                          <strong>{selectedHospital.name}</strong>
                        </div>
                      </InfoWindow>
                    )}

                    {/* Live user marker */}
                    {liveUserPos && (
                      <Marker
                        position={liveUserPos}
                        icon={{
                          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="44" height="44">
                              <circle cx="20" cy="20" r="18" fill="#DC2626" stroke="white" stroke-width="3"/>
                              <circle cx="20" cy="20" r="6" fill="white"/>
                            </svg>`
                          ),
                          scaledSize: isLoaded ? new window.google.maps.Size(44, 44) : undefined,
                          anchor: isLoaded ? new window.google.maps.Point(22, 22) : undefined,
                        }}
                        zIndex={1000}
                        onClick={() => setMapInfoOpen('user')}
                      />
                    )}
                    {mapInfoOpen === 'user' && liveUserPos && (
                      <InfoWindow position={liveUserPos} onCloseClick={() => setMapInfoOpen(null)}>
                        <div className="text-sm">
                          <strong>🚑 User En Route</strong>
                          <p className="text-gray-500 text-xs mt-1">
                            {liveUserPos.lat.toFixed(4)}, {liveUserPos.lng.toFixed(4)}
                          </p>
                        </div>
                      </InfoWindow>
                    )}

                    {/* Route from user to hospital */}
                    {directions && (
                      <DirectionsRenderer
                        directions={directions}
                        options={{
                          polylineOptions: {
                            strokeColor: '#DC2626',
                            strokeWeight: 5,
                            strokeOpacity: 0.8,
                          },
                          suppressMarkers: true,
                        }}
                      />
                    )}
                  </GoogleMap>

                  {liveUserPos && directions && (
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>
                        <span aria-hidden="true">📏</span> {directions.routes?.[0]?.legs?.[0]?.distance?.text || '...'}
                      </span>
                      <span>
                        <span aria-hidden="true">⏱️</span> ETA: {directions.routes?.[0]?.legs?.[0]?.duration?.text || '...'}
                      </span>
                    </div>
                  )}
                </section>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-600">
              <p className="text-4xl mb-3" aria-hidden="true">🏥</p>
              <p className="text-lg">Select a hospital to view details and alerts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
