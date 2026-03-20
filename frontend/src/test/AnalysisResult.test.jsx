import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnalysisResult from '../components/AnalysisResult'

describe('AnalysisResult', () => {
  const mockAnalysis = {
    emergency_type: 'cardiac',
    severity: 'critical',
    confidence_score: 0.95,
    required_facilities: ['ICU', 'Cardiology'],
  }

  it('returns null when analysis is null', () => {
    const { container } = render(<AnalysisResult analysis={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when analysis is undefined', () => {
    const { container } = render(<AnalysisResult analysis={undefined} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders AI Analysis heading', () => {
    render(<AnalysisResult analysis={mockAnalysis} />)
    expect(screen.getByText(/AI Analysis/)).toBeInTheDocument()
  })

  it('renders emergency type', () => {
    render(<AnalysisResult analysis={mockAnalysis} />)
    expect(screen.getByText('cardiac')).toBeInTheDocument()
  })

  it('renders severity in uppercase', () => {
    render(<AnalysisResult analysis={mockAnalysis} />)
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
  })

  it('renders confidence score as percentage', () => {
    render(<AnalysisResult analysis={mockAnalysis} />)
    expect(screen.getByText('95%')).toBeInTheDocument()
  })

  it('renders required facilities', () => {
    render(<AnalysisResult analysis={mockAnalysis} />)
    expect(screen.getByText('ICU')).toBeInTheDocument()
    expect(screen.getByText('Cardiology')).toBeInTheDocument()
  })

  it('renders correct severity class for critical', () => {
    const { container } = render(<AnalysisResult analysis={mockAnalysis} />)
    const badge = screen.getByText('CRITICAL')
    expect(badge.className).toContain('bg-red-100')
  })

  it('renders correct severity class for high', () => {
    const analysis = { ...mockAnalysis, severity: 'high' }
    render(<AnalysisResult analysis={analysis} />)
    const badge = screen.getByText('HIGH')
    expect(badge.className).toContain('bg-orange-100')
  })

  it('renders correct severity class for moderate', () => {
    const analysis = { ...mockAnalysis, severity: 'moderate' }
    render(<AnalysisResult analysis={analysis} />)
    const badge = screen.getByText('MODERATE')
    expect(badge.className).toContain('bg-yellow-100')
  })

  it('renders correct severity class for low', () => {
    const analysis = { ...mockAnalysis, severity: 'low' }
    render(<AnalysisResult analysis={analysis} />)
    const badge = screen.getByText('LOW')
    expect(badge.className).toContain('bg-green-100')
  })

  it('renders default severity class for unknown', () => {
    const analysis = { ...mockAnalysis, severity: 'unknown' }
    render(<AnalysisResult analysis={analysis} />)
    const badge = screen.getByText('UNKNOWN')
    expect(badge.className).toContain('bg-yellow-100')
  })

  it('renders confidence bar with correct width', () => {
    const { container } = render(<AnalysisResult analysis={mockAnalysis} />)
    const bar = container.querySelector('.bg-indigo-600')
    expect(bar.style.width).toBe('95%')
  })
})
