import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Hoisted variables for use in vi.mock factories
const { mockGet, mockLogout, mockNavigate, mockGetHospitals, mockUserRef } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockLogout: vi.fn(),
  mockNavigate: vi.fn(),
  mockGetHospitals: vi.fn(),
  mockUserRef: { current: { email: 'doc@hospital.com' } },
}))

// Mock Google Maps
vi.mock('@react-google-maps/api', () => ({
  useJsApiLoader: () => ({ isLoaded: true }),
  GoogleMap: ({ children, onLoad }) => {
    if (onLoad) onLoad({})
    return <div data-testid="google-map">{children}</div>
  },
  Marker: ({ onClick }) => <div data-testid="marker" onClick={onClick} />,
  InfoWindow: ({ children, onCloseClick }) => <div data-testid="info-window" onClick={onCloseClick}>{children}</div>,
  DirectionsRenderer: () => <div data-testid="directions-renderer" />,
}))

// Mock API
vi.mock('../api', () => ({
  default: { get: mockGet },
  getHospitals: mockGetHospitals,
}))

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUserRef.current, logout: mockLogout }),
}))

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

import HospitalDashboard from '../pages/HospitalDashboard'

const mockHospitals = [
  {
    id: 'h1',
    name: 'Apollo Hospital',
    location: { lat: 17.43, lng: 78.46 },
    facilities: ['ICU', 'Cardiology', 'Emergency', 'XRay'],
    availability: { icu_beds: 5, emergency_slots: 10 },
  },
  {
    id: 'h2',
    name: 'Care Hospital',
    location: { lat: 17.44, lng: 78.47 },
    facilities: ['ICU', 'Neurology'],
    availability: { icu_beds: 2, emergency_slots: 3 },
  },
]

describe('HospitalDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHospitals.mockResolvedValue({ data: mockHospitals })
    mockGet.mockResolvedValue({ data: [] })
    // Provide google maps globals
    window.google = {
      maps: {
        Size: function(w, h) { this.width = w; this.height = h },
        Point: function(x, y) { this.x = x; this.y = y },
        LatLng: vi.fn((lat, lng) => ({ lat, lng })),
        DirectionsService: vi.fn(() => ({
          route: vi.fn((req, cb) => cb({ routes: [{ legs: [{ distance: { text: '5 km' }, duration: { text: '10 min' } }] }] }, 'OK')),
        })),
        TravelMode: { DRIVING: 'DRIVING' },
      },
    }
  })

  afterEach(() => {
    delete window.google
  })

  it('renders dashboard header', async () => {
    render(<HospitalDashboard />)
    await waitFor(() => {
      expect(screen.getByText('🏥 Hospital Dashboard')).toBeInTheDocument()
    })
  })

  it('shows user email', async () => {
    render(<HospitalDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Logged in as doc@hospital.com')).toBeInTheDocument()
    })
  })

  it('loads and displays hospital list', async () => {
    render(<HospitalDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Apollo Hospital')).toBeInTheDocument()
      expect(screen.getByText('Care Hospital')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    mockGetHospitals.mockImplementation(() => new Promise(() => {})) // never resolves
    render(<HospitalDashboard />)
    expect(screen.getByText('Loading hospitals...')).toBeInTheDocument()
  })

  it('shows error when fetch fails', async () => {
    mockGetHospitals.mockRejectedValue(new Error('fail'))
    render(<HospitalDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load hospitals.')).toBeInTheDocument()
    })
  })

  it('shows prompt to select hospital', async () => {
    render(<HospitalDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Select a hospital to view details and alerts')).toBeInTheDocument()
    })
  })

  it('selects a hospital and shows details', async () => {
    render(<HospitalDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Apollo Hospital')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Apollo Hospital'))

    await waitFor(() => {
      expect(screen.getByText('No incoming alerts.')).toBeInTheDocument()
    })
  })

  it('shows facilities overflow count', async () => {
    render(<HospitalDashboard />)
    await waitFor(() => {
      expect(screen.getByText('+1')).toBeInTheDocument() // Apollo has 4 facilities, shows 3 + "+1"
    })
  })

  it('displays alerts for selected hospital', async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          alert_id: 'a1',
          emergency_type: 'cardiac',
          eta: '10 mins',
          requirements: ['ICU'],
          timestamp: '2024-01-01T00:00:00',
          user_lat: 17.38,
          user_lng: 78.48,
        },
      ],
    })

    render(<HospitalDashboard />)
    await waitFor(() => expect(screen.getByText('Apollo Hospital')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Apollo Hospital'))

    await waitFor(() => {
      expect(screen.getByText(/cardiac Emergency/)).toBeInTheDocument()
      expect(screen.getByText('ETA: 10 mins')).toBeInTheDocument()
    })
  })

  it('starts and stops live tracking', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [{ alert_id: 'a1', emergency_type: 'cardiac', eta: '10 mins', requirements: ['ICU'], timestamp: '2024-01-01' }],
      })
      .mockResolvedValue({ data: { lat: 17.38, lng: 78.48 } })

    render(<HospitalDashboard />)
    await waitFor(() => expect(screen.getByText('Apollo Hospital')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Apollo Hospital'))

    await waitFor(() => expect(screen.getByText('📍 Track Live')).toBeInTheDocument())

    // Start tracking
    await act(async () => {
      fireEvent.click(screen.getByText('📍 Track Live'))
    })

    await waitFor(() => {
      expect(screen.getByText('⏹ Stop Tracking')).toBeInTheDocument()
    })

    // Stop tracking
    await act(async () => {
      fireEvent.click(screen.getByText('⏹ Stop Tracking'))
    })

    await waitFor(() => {
      expect(screen.getByText('📍 Track Live')).toBeInTheDocument()
    })
  })

  it('handles logout', async () => {
    mockLogout.mockResolvedValue()
    render(<HospitalDashboard />)
    await waitFor(() => expect(screen.getByText('🚪 Logout')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('🚪 Logout'))
    })

    expect(mockLogout).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/hospital/auth')
  })

  it('alert count badge shows when alerts exist', async () => {
    mockGet.mockResolvedValue({
      data: [
        { alert_id: 'a1', emergency_type: 'cardiac', eta: '10 mins', requirements: [], timestamp: '' },
        { alert_id: 'a2', emergency_type: 'trauma', eta: '5 mins', requirements: [], timestamp: '' },
      ],
    })

    render(<HospitalDashboard />)
    await waitFor(() => expect(screen.getByText('Apollo Hospital')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Apollo Hospital'))

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('shows live location map with tracking data', async () => {
    // First call returns alerts, subsequent calls return live location
    mockGet
      .mockResolvedValueOnce({
        data: [{ alert_id: 'a1', emergency_type: 'cardiac', eta: '10 mins', requirements: ['ICU'], timestamp: '2024-01-01' }],
      })
      .mockResolvedValue({ data: { lat: 17.38, lng: 78.48 } })

    render(<HospitalDashboard />)
    await waitFor(() => expect(screen.getByText('Apollo Hospital')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Apollo Hospital'))

    await waitFor(() => expect(screen.getByText('📍 Track Live')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('📍 Track Live'))
    })

    // Wait for the live location map section to appear
    await waitFor(() => {
      expect(screen.getByText('📡 Live User Location')).toBeInTheDocument()
    })
  })
})

describe('HospitalDashboard - no user', () => {
  it('redirects to auth when no user', () => {
    mockUserRef.current = null
    render(<HospitalDashboard />)
    expect(mockNavigate).toHaveBeenCalledWith('/hospital/auth')
    mockUserRef.current = { email: 'doc@hospital.com' }
  })
})
