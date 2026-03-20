import { useState, useEffect, useCallback, useRef } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
  InfoWindow,
} from '@react-google-maps/api'

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '500px',
  borderRadius: '12px',
}

const DEFAULT_CENTER = { lat: 17.385, lng: 78.4867 } // Hyderabad

const LIBRARIES = ['places']

export default function MapView({ userCoords, matches, selectedHospitalId, onSelectHospital }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  })

  const mapRef = useRef(null)
  const animationRef = useRef(null)
  const [directions, setDirections] = useState(null)
  const [routeSteps, setRouteSteps] = useState([])
  const [livePosition, setLivePosition] = useState(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [activeInfo, setActiveInfo] = useState(null)
  const [eta, setEta] = useState('')
  const [routeSummary, setRouteSummary] = useState('')
  const stepIndexRef = useRef(0)

  const center = userCoords || DEFAULT_CENTER

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  // Fetch route when a hospital is selected
  useEffect(() => {
    if (!isLoaded || !selectedHospitalId || !userCoords) {
      setDirections(null)
      setRouteSteps([])
      setLivePosition(null)
      setIsNavigating(false)
      setEta('')
      setRouteSummary('')
      return
    }

    const hospital = matches?.find((m) => m.hospital.id === selectedHospitalId)?.hospital
    if (!hospital) return

    const directionsService = new window.google.maps.DirectionsService()

    directionsService.route(
      {
        origin: new window.google.maps.LatLng(userCoords.lat, userCoords.lng),
        destination: new window.google.maps.LatLng(hospital.location.lat, hospital.location.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result)

          const leg = result.routes[0].legs[0]
          setEta(leg.duration.text)
          setRouteSummary(`${leg.distance.text} — ${leg.duration.text}`)

          // Extract detailed path points for smooth animation
          const path = result.routes[0].overview_path.map((p) => ({
            lat: p.lat(),
            lng: p.lng(),
          }))
          // Interpolate for smoother movement
          const interpolated = interpolatePath(path, 200)
          setRouteSteps(interpolated)
          setLivePosition(interpolated[0])
          stepIndexRef.current = 0

          // Fit bounds
          if (mapRef.current) {
            const bounds = new window.google.maps.LatLngBounds()
            bounds.extend(new window.google.maps.LatLng(userCoords.lat, userCoords.lng))
            bounds.extend(new window.google.maps.LatLng(hospital.location.lat, hospital.location.lng))
            mapRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 })
          }
        }
      }
    )

    return () => stopNavigation()
  }, [isLoaded, selectedHospitalId, userCoords, matches])

  // Interpolate between path points for smooth animation
  function interpolatePath(points, totalSteps) {
    if (points.length < 2) return points

    // Calculate cumulative distances
    const distances = [0]
    for (let i = 1; i < points.length; i++) {
      const d = haversine(points[i - 1], points[i])
      distances.push(distances[i - 1] + d)
    }
    const totalDist = distances[distances.length - 1]
    if (totalDist === 0) return points

    const result = []
    for (let s = 0; s <= totalSteps; s++) {
      const targetDist = (s / totalSteps) * totalDist
      // Find which segment this falls on
      let segIdx = 0
      for (let i = 1; i < distances.length; i++) {
        if (distances[i] >= targetDist) {
          segIdx = i - 1
          break
        }
      }
      const segLen = distances[segIdx + 1] - distances[segIdx]
      const t = segLen > 0 ? (targetDist - distances[segIdx]) / segLen : 0
      result.push({
        lat: points[segIdx].lat + t * (points[segIdx + 1].lat - points[segIdx].lat),
        lng: points[segIdx].lng + t * (points[segIdx + 1].lng - points[segIdx].lng),
      })
    }
    return result
  }

  function haversine(a, b) {
    const R = 6371
    const dLat = ((b.lat - a.lat) * Math.PI) / 180
    const dLng = ((b.lng - a.lng) * Math.PI) / 180
    const sinLat = Math.sin(dLat / 2)
    const sinLng = Math.sin(dLng / 2)
    const h =
      sinLat * sinLat +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  }

  const startNavigation = () => {
    if (routeSteps.length === 0) return
    setIsNavigating(true)
    stepIndexRef.current = 0
    setLivePosition(routeSteps[0])
    animateStep()
  }

  const animateStep = () => {
    animationRef.current = setInterval(() => {
      stepIndexRef.current += 1
      if (stepIndexRef.current >= routeSteps.length) {
        stopNavigation()
        return
      }
      const pos = routeSteps[stepIndexRef.current]
      setLivePosition(pos)

      // Calculate remaining ETA
      const remaining = routeSteps.length - stepIndexRef.current
      const totalSec = routeSteps.length > 0 ? (remaining / routeSteps.length) : 0
      // We approximate ETA from the original route duration
      setEta(
        remaining > 0
          ? `~${Math.max(1, Math.round(totalSec * parseDurationToMin(routeSummary)))} min remaining`
          : 'Arrived!'
      )

      // Pan map to follow
      if (mapRef.current) {
        mapRef.current.panTo(pos)
      }
    }, 150) // Move every 150ms for smooth animation
  }

  const stopNavigation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current)
      animationRef.current = null
    }
    setIsNavigating(false)
  }

  function parseDurationToMin(summary) {
    if (!summary) return 10
    const match = summary.match(/(\d+)\s*min/)
    if (match) return parseInt(match[1], 10)
    const hourMatch = summary.match(/(\d+)\s*hour/)
    if (hourMatch) return parseInt(hourMatch[1], 10) * 60
    return 10
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopNavigation()
  }, [])

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700" role="alert">
        Failed to load Google Maps. Please check your API key.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <output className="bg-white rounded-xl shadow-md p-8 text-center text-gray-600 block" aria-label="Loading map">
        <span className="animate-spin inline-block mr-2" aria-hidden="true">⏳</span> Loading map...
      </output>
    )
  }

  const selectedHospital = matches?.find((m) => m.hospital.id === selectedHospitalId)?.hospital

  return (
    <section className="bg-white rounded-xl shadow-md p-4 space-y-3" aria-label="Route map">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800"><span aria-hidden="true">🗺️</span> Route Map</h2>
        {routeSummary && (
          <span className="text-sm text-gray-600">{routeSummary}</span>
        )}
      </div>

      {/* Navigation controls */}
      {selectedHospitalId && routeSteps.length > 0 && (
        <div className="flex items-center gap-3">
          {!isNavigating ? (
            <button
              onClick={startNavigation}
              aria-label="Start live ambulance tracking"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <span aria-hidden="true">🚑</span> Start Live Tracking
            </button>
          ) : (
            <button
              onClick={stopNavigation}
              aria-label="Stop live ambulance tracking"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <span aria-hidden="true">⏹️</span> Stop Tracking
            </button>
          )}
          {eta && (
            <output className="text-sm font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full" aria-live="polite">
              <span aria-hidden="true">⏱️</span> {eta}
            </output>
          )}
          {selectedHospital && (
            <span className="text-sm text-gray-700">
              → {selectedHospital.name}
            </span>
          )}
        </div>
      )}

      {!selectedHospitalId && matches?.length > 0 && (
        <p className="text-sm text-gray-600">Click &quot;Show Route&quot; on a hospital card to see directions</p>
      )}

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={13}
        onLoad={onMapLoad}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {/* User location marker */}
        {userCoords && !isNavigating && (
          <Marker
            position={userCoords}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
                  <circle cx="12" cy="12" r="10" fill="#4F46E5" stroke="white" stroke-width="2"/>
                  <circle cx="12" cy="12" r="4" fill="white"/>
                </svg>`
              ),
              scaledSize: new window.google.maps.Size(36, 36),
              anchor: new window.google.maps.Point(18, 18),
            }}
            onClick={() => setActiveInfo('user')}
          />
        )}

        {/* Live ambulance position */}
        {livePosition && isNavigating && (
          <Marker
            position={livePosition}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="44" height="44">
                  <circle cx="20" cy="20" r="18" fill="#DC2626" stroke="white" stroke-width="3"/>
                  <text x="20" y="26" text-anchor="middle" font-size="18">🚑</text>
                </svg>`
              ),
              scaledSize: new window.google.maps.Size(44, 44),
              anchor: new window.google.maps.Point(22, 22),
            }}
            zIndex={1000}
          />
        )}

        {/* Hospital markers */}
        {matches?.map((match) => (
          <Marker
            key={match.hospital.id}
            position={{
              lat: match.hospital.location.lat,
              lng: match.hospital.location.lng,
            }}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">
                  <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="${match.hospital.id === selectedHospitalId ? '#059669' : '#4F46E5'}"/>
                  <text x="16" y="20" text-anchor="middle" font-size="14" fill="white">🏥</text>
                </svg>`
              ),
              scaledSize: new window.google.maps.Size(32, 40),
              anchor: new window.google.maps.Point(16, 40),
            }}
            onClick={() => {
              setActiveInfo(match.hospital.id)
              if (onSelectHospital) onSelectHospital(match.hospital.id)
            }}
          />
        ))}

        {/* Info windows */}
        {activeInfo === 'user' && userCoords && (
          <InfoWindow position={userCoords} onCloseClick={() => setActiveInfo(null)}>
            <div className="text-sm">
              <strong><span aria-hidden="true">📍</span> Your Location</strong>
              <p className="text-gray-600 text-xs mt-1">
                {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}
              </p>
            </div>
          </InfoWindow>
        )}

        {activeInfo && activeInfo !== 'user' && (() => {
          const match = matches?.find((m) => m.hospital.id === activeInfo)
          if (!match) return null
          return (
            <InfoWindow
              position={{
                lat: match.hospital.location.lat,
                lng: match.hospital.location.lng,
              }}
              onCloseClick={() => setActiveInfo(null)}
            >
              <div className="text-sm min-w-[180px]">
                <strong>{match.hospital.name}</strong>
                <p className="text-gray-600 text-xs mt-1">{match.distance_km} km away</p>
                <p className="text-xs mt-1">
                  Score: <strong>{match.match_score}/100</strong>
                  <span className="ml-2"><span aria-hidden="true">🛏️</span> ICU: {match.hospital.availability.icu_beds}</span>
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {match.hospital.facilities.slice(0, 4).map((f) => (
                    <span key={f} className="bg-indigo-50 text-indigo-700 text-xs px-1.5 py-0.5 rounded">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </InfoWindow>
          )
        })()}

        {/* Route overlay */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              polylineOptions: {
                strokeColor: '#4F46E5',
                strokeWeight: 5,
                strokeOpacity: 0.8,
              },
              suppressMarkers: true,
            }}
          />
        )}
      </GoogleMap>
    </section>
  )
}
