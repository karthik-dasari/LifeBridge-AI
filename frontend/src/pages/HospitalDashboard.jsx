import { useState, useEffect } from 'react'
import apiClient, { getHospitals } from '../api'

export default function HospitalDashboard() {
  const [hospitals, setHospitals] = useState([])
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHospitals()
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

  const selectHospital = async (hospital) => {
    setSelectedHospital(hospital)
    try {
      const res = await apiClient.get(`/alerts/${hospital.id}`)
      setAlerts(res.data)
    } catch {
      setAlerts([])
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-500">
        Loading hospitals...
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">🏥 Hospital Dashboard</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-4">
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
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedHospital?.id === h.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
              }`}
            >
              <h3 className="font-semibold text-gray-900">{h.name}</h3>
              <p className="text-xs text-gray-500 mt-1">
                📍 {h.location.lat.toFixed(4)}, {h.location.lng.toFixed(4)}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {h.facilities.slice(0, 3).map((f) => (
                  <span key={f} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                    {f}
                  </span>
                ))}
                {h.facilities.length > 3 && (
                  <span className="text-xs text-gray-400">+{h.facilities.length - 3}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="md:col-span-2">
          {selectedHospital ? (
            <div className="space-y-6">
              {/* Hospital Details */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedHospital.name}</h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                    <p className="text-sm text-gray-700">
                      {selectedHospital.location.lat.toFixed(4)}, {selectedHospital.location.lng.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Availability</p>
                    <p className="text-sm text-gray-700">
                      🛏️ ICU Beds: <strong>{selectedHospital.availability.icu_beds}</strong> &nbsp;|&nbsp;
                      🚑 Emergency Slots: <strong>{selectedHospital.availability.emergency_slots}</strong>
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Facilities</p>
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
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🔔 Incoming Alerts</h3>
                {alerts.length === 0 ? (
                  <p className="text-sm text-gray-500">No incoming alerts.</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert, idx) => (
                      <div key={alert.id || idx} className="border border-red-200 bg-red-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-red-800 capitalize">
                              🚨 {alert.emergency_type} Emergency
                            </p>
                            <p className="text-sm text-gray-600 mt-1">ETA: {alert.eta}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(alert.requirements || []).map((r) => (
                                <span key={r} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">{alert.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">🏥</p>
              <p className="text-lg">Select a hospital to view details and alerts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
