import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HospitalCard from '../components/HospitalCard'

const makeMatch = (overrides = {}) => ({
  hospital: {
    id: 'h1',
    name: 'Apollo Hospital',
    location: { lat: 17.43, lng: 78.46 },
    facilities: ['ICU', 'Cardiology', 'Emergency'],
    availability: { icu_beds: 5, emergency_slots: 10 },
  },
  match_score: 85,
  distance_km: 3.5,
  match_type: 'exact',
  ...overrides,
})

describe('HospitalCard', () => {
  it('renders hospital name and distance', () => {
    render(
      <HospitalCard
        match={makeMatch()}
        onAlert={vi.fn()}
        alertSent={false}
        isRouteSelected={false}
        onShowRoute={vi.fn()}
      />
    )
    expect(screen.getByText('Apollo Hospital')).toBeInTheDocument()
    expect(screen.getByText('3.5 km away')).toBeInTheDocument()
  })

  it('shows exact match badge', () => {
    render(
      <HospitalCard match={makeMatch()} onAlert={vi.fn()} alertSent={false} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText('✅ Best Match')).toBeInTheDocument()
  })

  it('shows partial match badge', () => {
    render(
      <HospitalCard match={makeMatch({ match_type: 'partial' })} onAlert={vi.fn()} alertSent={false} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText('🔶 Partial Match')).toBeInTheDocument()
  })

  it('shows nearest match badge', () => {
    render(
      <HospitalCard match={makeMatch({ match_type: 'nearest' })} onAlert={vi.fn()} alertSent={false} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText('📍 Nearest')).toBeInTheDocument()
  })

  it('shows unknown match type as nearest', () => {
    render(
      <HospitalCard match={makeMatch({ match_type: 'unknown' })} onAlert={vi.fn()} alertSent={false} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText('📍 Nearest')).toBeInTheDocument()
  })

  it('renders match score', () => {
    render(
      <HospitalCard match={makeMatch()} onAlert={vi.fn()} alertSent={false} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText('85/100')).toBeInTheDocument()
  })

  it('renders facilities', () => {
    render(
      <HospitalCard match={makeMatch()} onAlert={vi.fn()} alertSent={false} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText('ICU')).toBeInTheDocument()
    expect(screen.getByText('Cardiology')).toBeInTheDocument()
    expect(screen.getByText('Emergency')).toBeInTheDocument()
  })

  it('renders availability info', () => {
    render(
      <HospitalCard match={makeMatch()} onAlert={vi.fn()} alertSent={false} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('calls onAlert when alert button clicked', () => {
    const onAlert = vi.fn()
    render(
      <HospitalCard match={makeMatch()} onAlert={onAlert} alertSent={false} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    fireEvent.click(screen.getByText('🔔 Alert Hospital'))
    expect(onAlert).toHaveBeenCalledWith('h1')
  })

  it('shows alert sent state', () => {
    render(
      <HospitalCard match={makeMatch()} onAlert={vi.fn()} alertSent={true} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText('✅ Alert Sent')).toBeInTheDocument()
  })

  it('disables alert button when alert sent', () => {
    render(
      <HospitalCard match={makeMatch()} onAlert={vi.fn()} alertSent={true} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText('✅ Alert Sent')).toBeDisabled()
  })

  it('calls onShowRoute when show route clicked', () => {
    const onShowRoute = vi.fn()
    render(
      <HospitalCard match={makeMatch()} onAlert={vi.fn()} alertSent={false} isRouteSelected={false} onShowRoute={onShowRoute} />
    )
    fireEvent.click(screen.getByText('🗺️ Show Route'))
    expect(onShowRoute).toHaveBeenCalledWith('h1')
  })

  it('shows route selected state', () => {
    render(
      <HospitalCard match={makeMatch()} onAlert={vi.fn()} alertSent={false} isRouteSelected={true} onShowRoute={vi.fn()} />
    )
    expect(screen.getByText('✅ Route Shown')).toBeInTheDocument()
  })

  it('calls onShowRoute with null when route already selected', () => {
    const onShowRoute = vi.fn()
    render(
      <HospitalCard match={makeMatch()} onAlert={vi.fn()} alertSent={false} isRouteSelected={true} onShowRoute={onShowRoute} />
    )
    fireEvent.click(screen.getByText('✅ Route Shown'))
    expect(onShowRoute).toHaveBeenCalledWith(null)
  })

  it('applies green score bar for high score', () => {
    const { container } = render(
      <HospitalCard match={makeMatch({ match_score: 85 })} onAlert={vi.fn()} alertSent={false} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    const scoreBar = container.querySelector('.bg-green-500')
    expect(scoreBar).toBeTruthy()
  })

  it('applies yellow score bar for medium score', () => {
    const { container } = render(
      <HospitalCard match={makeMatch({ match_score: 50 })} onAlert={vi.fn()} alertSent={false} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    const scoreBar = container.querySelector('.bg-yellow-500')
    expect(scoreBar).toBeTruthy()
  })

  it('applies red score bar for low score', () => {
    const { container } = render(
      <HospitalCard match={makeMatch({ match_score: 20 })} onAlert={vi.fn()} alertSent={false} isRouteSelected={false} onShowRoute={vi.fn()} />
    )
    const scoreBar = container.querySelector('.bg-red-400')
    expect(scoreBar).toBeTruthy()
  })
})
