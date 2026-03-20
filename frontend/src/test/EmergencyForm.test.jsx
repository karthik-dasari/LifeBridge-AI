import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EmergencyForm from '../components/EmergencyForm'

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(global.navigator, 'geolocation', {
    value: mockGeolocation,
    configurable: true,
  })
})

describe('EmergencyForm', () => {
  it('renders form elements', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((s) => s({ coords: { latitude: 17.0, longitude: 78.0 } }))
    render(<EmergencyForm onAnalyze={vi.fn()} loading={false} />)
    expect(screen.getByText('Describe Your Emergency')).toBeInTheDocument()
    expect(screen.getByText('✏️ Text Input')).toBeInTheDocument()
    expect(screen.getByText('🎤 Voice (Simulated)')).toBeInTheDocument()
    expect(screen.getByText(/Analyze Emergency/)).toBeInTheDocument()
  })

  it('renders location input and GPS button', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((s) => s({ coords: { latitude: 17.0, longitude: 78.0 } }))
    render(<EmergencyForm onAnalyze={vi.fn()} loading={false} />)
    expect(screen.getByPlaceholderText(/Hyderabad/)).toBeInTheDocument()
    expect(screen.getByText(/Use GPS/)).toBeInTheDocument()
  })

  it('disables submit when input is empty', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((s) => s({ coords: { latitude: 17.0, longitude: 78.0 } }))
    render(<EmergencyForm onAnalyze={vi.fn()} loading={false} />)
    const btn = screen.getByText(/Analyze Emergency/)
    expect(btn).toBeDisabled()
  })

  it('enables submit when input has text', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((s) => s({ coords: { latitude: 17.0, longitude: 78.0 } }))
    render(<EmergencyForm onAnalyze={vi.fn()} loading={false} />)
    const textarea = screen.getByPlaceholderText(/chest pain/)
    fireEvent.change(textarea, { target: { value: 'test emergency' } })
    const btn = screen.getByText(/Analyze Emergency/)
    expect(btn).not.toBeDisabled()
  })

  it('calls onAnalyze with payload on submit', () => {
    const onAnalyze = vi.fn()
    mockGeolocation.getCurrentPosition.mockImplementation((s) => s({ coords: { latitude: 17.5, longitude: 78.5 } }))
    render(<EmergencyForm onAnalyze={onAnalyze} loading={false} />)
    const textarea = screen.getByPlaceholderText(/chest pain/)
    fireEvent.change(textarea, { target: { value: 'chest pain' } })
    const form = textarea.closest('form')
    fireEvent.submit(form)
    expect(onAnalyze).toHaveBeenCalledWith(
      expect.objectContaining({ input_text: 'chest pain', lat: 17.5, lng: 78.5 })
    )
  })

  it('does not call onAnalyze when input is empty', () => {
    const onAnalyze = vi.fn()
    mockGeolocation.getCurrentPosition.mockImplementation(() => {})
    render(<EmergencyForm onAnalyze={onAnalyze} loading={false} />)
    const textarea = screen.getByPlaceholderText(/chest pain/)
    const form = textarea.closest('form')
    fireEvent.submit(form)
    expect(onAnalyze).not.toHaveBeenCalled()
  })

  it('shows loading state', () => {
    mockGeolocation.getCurrentPosition.mockImplementation(() => {})
    render(<EmergencyForm onAnalyze={vi.fn()} loading={true} />)
    expect(screen.getByText('Analyzing...')).toBeInTheDocument()
  })

  it('toggles to voice mode', () => {
    mockGeolocation.getCurrentPosition.mockImplementation(() => {})
    render(<EmergencyForm onAnalyze={vi.fn()} loading={false} />)
    fireEvent.click(screen.getByText('🎤 Voice (Simulated)'))
    expect(screen.getByText('Voice Transcript')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/voice transcript/i)).toBeInTheDocument()
  })

  it('toggles back to text mode', () => {
    mockGeolocation.getCurrentPosition.mockImplementation(() => {})
    render(<EmergencyForm onAnalyze={vi.fn()} loading={false} />)
    fireEvent.click(screen.getByText('🎤 Voice (Simulated)'))
    fireEvent.click(screen.getByText('✏️ Text Input'))
    expect(screen.getByText('Emergency Description')).toBeInTheDocument()
  })

  it('detects GPS location on mount', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 17.3850, longitude: 78.4867 } })
    })
    render(<EmergencyForm onAnalyze={vi.fn()} loading={false} />)
    expect(screen.getByText(/GPS location detected/)).toBeInTheDocument()
  })

  it('handles GPS location error', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
      error(new Error('denied'))
    })
    render(<EmergencyForm onAnalyze={vi.fn()} loading={false} />)
    expect(screen.getByText(/Unable to get location/)).toBeInTheDocument()
  })

  it('handles no geolocation support', () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    })
    render(<EmergencyForm onAnalyze={vi.fn()} loading={false} />)
    expect(screen.getByText(/Geolocation is not supported/)).toBeInTheDocument()
  })

  it('clears coords when location input changes', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((s) => s({ coords: { latitude: 17.0, longitude: 78.0 } }))
    const onAnalyze = vi.fn()
    render(<EmergencyForm onAnalyze={onAnalyze} loading={false} />)
    const locInput = screen.getByPlaceholderText(/Hyderabad/)
    fireEvent.change(locInput, { target: { value: 'Mumbai' } })
    const textarea = screen.getByPlaceholderText(/chest pain/)
    fireEvent.change(textarea, { target: { value: 'chest pain' } })
    fireEvent.submit(textarea.closest('form'))
    expect(onAnalyze).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'Mumbai' })
    )
    // Should NOT have lat/lng after manual location edit
    const call = onAnalyze.mock.calls[0][0]
    expect(call.lat).toBeUndefined()
    expect(call.lng).toBeUndefined()
  })

  it('submits with default location when GPS not available', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((_, err) => err())
    const onAnalyze = vi.fn()
    render(<EmergencyForm onAnalyze={onAnalyze} loading={false} />)
    const textarea = screen.getByPlaceholderText(/chest pain/)
    fireEvent.change(textarea, { target: { value: 'test' } })
    fireEvent.submit(textarea.closest('form'))
    expect(onAnalyze).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'Hyderabad' })
    )
  })

  it('clicking GPS button re-detects location', () => {
    mockGeolocation.getCurrentPosition.mockImplementation((_, err) => err())
    render(<EmergencyForm onAnalyze={vi.fn()} loading={false} />)
    vi.clearAllMocks()
    mockGeolocation.getCurrentPosition.mockImplementation((s) => s({ coords: { latitude: 12.0, longitude: 77.0 } }))
    fireEvent.click(screen.getByText(/Use GPS/))
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()
  })
})
