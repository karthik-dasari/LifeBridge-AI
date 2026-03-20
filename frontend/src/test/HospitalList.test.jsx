import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HospitalList from '../components/HospitalList'

const makeMatches = () => [
  {
    hospital: {
      id: 'h1',
      name: 'Apollo Hospital',
      location: { lat: 17.43, lng: 78.46 },
      facilities: ['ICU', 'Cardiology'],
      availability: { icu_beds: 5, emergency_slots: 10 },
    },
    match_score: 85,
    distance_km: 3.5,
    match_type: 'exact',
  },
  {
    hospital: {
      id: 'h2',
      name: 'KIMS Hospital',
      location: { lat: 17.41, lng: 78.43 },
      facilities: ['ICU', 'Emergency'],
      availability: { icu_beds: 3, emergency_slots: 7 },
    },
    match_score: 60,
    distance_km: 5.2,
    match_type: 'partial',
  },
]

describe('HospitalList', () => {
  it('returns null when matches is null', () => {
    const { container } = render(
      <HospitalList matches={null} onAlert={vi.fn()} alertedHospitals={new Set()} selectedHospitalId={null} onShowRoute={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('returns null when matches is empty', () => {
    const { container } = render(
      <HospitalList matches={[]} onAlert={vi.fn()} alertedHospitals={new Set()} selectedHospitalId={null} onShowRoute={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders heading with count', () => {
    render(
      <HospitalList matches={makeMatches()} onAlert={vi.fn()} alertedHospitals={new Set()} selectedHospitalId={null} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText(/Recommended Hospitals \(2\)/)).toBeInTheDocument()
  })

  it('renders all hospital cards', () => {
    render(
      <HospitalList matches={makeMatches()} onAlert={vi.fn()} alertedHospitals={new Set()} selectedHospitalId={null} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText('Apollo Hospital')).toBeInTheDocument()
    expect(screen.getByText('KIMS Hospital')).toBeInTheDocument()
  })

  it('passes alertedHospitals correctly', () => {
    render(
      <HospitalList
        matches={makeMatches()}
        onAlert={vi.fn()}
        alertedHospitals={new Set(['h1'])}
        selectedHospitalId={null}
        onShowRoute={vi.fn()}
      />
    )
    expect(screen.getByText('✅ Alert Sent')).toBeInTheDocument()
  })

  it('passes selectedHospitalId correctly', () => {
    render(
      <HospitalList
        matches={makeMatches()}
        onAlert={vi.fn()}
        alertedHospitals={new Set()}
        selectedHospitalId="h1"
        onShowRoute={vi.fn()}
      />
    )
    expect(screen.getByText('✅ Route Shown')).toBeInTheDocument()
  })
})
