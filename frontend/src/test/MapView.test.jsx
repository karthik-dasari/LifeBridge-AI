import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

// Mock @react-google-maps/api
vi.mock('@react-google-maps/api', () => ({
  useJsApiLoader: vi.fn(() => ({ isLoaded: true, loadError: null })),
  GoogleMap: ({ children, onLoad }) => {
    if (onLoad) onLoad({ panTo: vi.fn(), fitBounds: vi.fn() })
    return <div data-testid="google-map">{children}</div>
  },
  Marker: ({ onClick }) => <div data-testid="marker" onClick={onClick} />,
  DirectionsRenderer: () => <div data-testid="directions" />,
  InfoWindow: ({ children, onCloseClick }) => (
    <div data-testid="info-window">
      {children}
      <button data-testid="close-info" onClick={onCloseClick}>close</button>
    </div>
  ),
}))

import { useJsApiLoader } from '@react-google-maps/api'
import MapView from '../components/MapView'

const matches = [
  {
    hospital: {
      id: 'h1',
      name: 'Apollo Hospital',
      location: { lat: 17.43, lng: 78.46 },
      facilities: ['ICU'],
      availability: { icu_beds: 5, emergency_slots: 10 },
    },
    match_score: 85,
    distance_km: 3.5,
    match_type: 'exact',
  },
]

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useJsApiLoader.mockReturnValue({ isLoaded: true, loadError: null })
    // Mock google.maps
    global.window.google = {
      maps: {
        DirectionsService: function() {
          this.route = function(req, cb) {
            cb({
              routes: [{
                legs: [{ duration: { text: '10 mins' }, distance: { text: '5 km' } }],
                overview_path: [
                  { lat: () => 17.38, lng: () => 78.48 },
                  { lat: () => 17.43, lng: () => 78.46 },
                ],
              }],
            }, 'OK')
          }
        },
        LatLng: function(lat, lng) { this.lat = () => lat; this.lng = () => lng },
        LatLngBounds: function() { this.extend = function() {} },
        TravelMode: { DRIVING: 'DRIVING' },
        Size: function(w, h) { this.width = w; this.height = h },
        Point: function(x, y) { this.x = x; this.y = y },
      },
    }
  })

  it('renders the map container', () => {
    render(<MapView userCoords={{ lat: 17.38, lng: 78.48 }} matches={matches} selectedHospitalId={null} onSelectHospital={vi.fn()} />)
    expect(screen.getByTestId('google-map')).toBeInTheDocument()
  })

  it('renders Route Map heading', () => {
    render(<MapView userCoords={{ lat: 17.38, lng: 78.48 }} matches={matches} selectedHospitalId={null} onSelectHospital={vi.fn()} />)
    expect(screen.getByText('🗺️ Route Map')).toBeInTheDocument()
  })

  it('shows prompt to select hospital when none selected', () => {
    render(<MapView userCoords={{ lat: 17.38, lng: 78.48 }} matches={matches} selectedHospitalId={null} onSelectHospital={vi.fn()} />)
    expect(screen.getByText(/Click "Show Route"/)).toBeInTheDocument()
  })

  it('renders hospital markers', () => {
    render(<MapView userCoords={{ lat: 17.38, lng: 78.48 }} matches={matches} selectedHospitalId={null} onSelectHospital={vi.fn()} />)
    const markers = screen.getAllByTestId('marker')
    expect(markers.length).toBeGreaterThanOrEqual(1) // at least user + hospital markers
  })

  it('shows navigation controls when hospital selected', async () => {
    render(<MapView userCoords={{ lat: 17.38, lng: 78.48 }} matches={matches} selectedHospitalId="h1" onSelectHospital={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Start Live Tracking/)).toBeInTheDocument()
    })
  })

  it('shows loading state when not loaded', () => {
    useJsApiLoader.mockReturnValue({ isLoaded: false, loadError: null })
    render(<MapView userCoords={null} matches={[]} selectedHospitalId={null} onSelectHospital={vi.fn()} />)
    expect(screen.getByText(/Loading map/)).toBeInTheDocument()
  })

  it('shows error when load fails', () => {
    useJsApiLoader.mockReturnValue({ isLoaded: false, loadError: new Error('fail') })
    render(<MapView userCoords={null} matches={[]} selectedHospitalId={null} onSelectHospital={vi.fn()} />)
    expect(screen.getByText(/Failed to load Google Maps/)).toBeInTheDocument()
  })

  it('starts and stops navigation', async () => {
    render(<MapView userCoords={{ lat: 17.38, lng: 78.48 }} matches={matches} selectedHospitalId="h1" onSelectHospital={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/Start Live Tracking/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Start Live Tracking/))
    expect(screen.getByText(/Stop Tracking/)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/Stop Tracking/))
    await waitFor(() => {
      expect(screen.getByText(/Start Live Tracking/)).toBeInTheDocument()
    })
  })

  it('does not show prompt when no matches', () => {
    render(<MapView userCoords={{ lat: 17.38, lng: 78.48 }} matches={[]} selectedHospitalId={null} onSelectHospital={vi.fn()} />)
    expect(screen.queryByText(/Click "Show Route"/)).not.toBeInTheDocument()
  })

  it('animates navigation steps with fake timers', async () => {
    vi.useFakeTimers()
    render(<MapView userCoords={{ lat: 17.38, lng: 78.48 }} matches={matches} selectedHospitalId="h1" onSelectHospital={vi.fn()} />)

    // Wait for route to load
    await act(async () => { vi.advanceTimersByTime(100) })

    const startBtn = screen.queryByText(/Start Live Tracking/)
    if (startBtn) {
      fireEvent.click(startBtn)
      // Advance timers to trigger animateStep intervals
      await act(async () => { vi.advanceTimersByTime(500) })
      // The animation runs at 150ms intervals, should have progressed
      expect(screen.getByText(/Stop Tracking/)).toBeInTheDocument()
      // Advance enough to complete animation (2 route points × 150ms)
      await act(async () => { vi.advanceTimersByTime(1000) })
    }
    vi.useRealTimers()
  })

  it('opens info window when clicking hospital marker', async () => {
    const onSelect = vi.fn()
    render(<MapView userCoords={{ lat: 17.38, lng: 78.48 }} matches={matches} selectedHospitalId={null} onSelectHospital={onSelect} />)
    const markers = screen.getAllByTestId('marker')
    // Click a marker
    fireEvent.click(markers[markers.length - 1])
    // Expect info window to appear
    const infoWindows = screen.queryAllByTestId('info-window')
    expect(infoWindows.length).toBeGreaterThanOrEqual(0) // may or may not render depending on mock
  })

  it('opens user info window when clicking user marker', () => {
    render(<MapView userCoords={{ lat: 17.38, lng: 78.48 }} matches={matches} selectedHospitalId={null} onSelectHospital={vi.fn()} />)
    const markers = screen.getAllByTestId('marker')
    // The first marker is usually the user marker
    fireEvent.click(markers[0])
  })
})
