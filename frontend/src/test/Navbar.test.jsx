import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}))

import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

const renderNavbar = (path = '/') => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>
  )
}

describe('Navbar', () => {
  it('renders LifeBridge AI brand', () => {
    renderNavbar()
    expect(screen.getByText('LifeBridge AI')).toBeInTheDocument()
  })

  it('renders Emergency link', () => {
    renderNavbar()
    expect(screen.getByText('Emergency')).toBeInTheDocument()
  })

  it('shows Hospital Login when no user', () => {
    useAuth.mockReturnValue({ user: null })
    renderNavbar()
    expect(screen.getByText('🔐 Hospital Login')).toBeInTheDocument()
  })

  it('shows Dashboard when user is logged in', () => {
    useAuth.mockReturnValue({ user: { email: 'test@test.com' } })
    renderNavbar()
    expect(screen.getByText('📊 Dashboard')).toBeInTheDocument()
  })

  it('Emergency link has active style on /', () => {
    useAuth.mockReturnValue({ user: null })
    renderNavbar('/')
    const link = screen.getByText('Emergency')
    expect(link.className).toContain('bg-white')
  })

  it('hospital link points to /hospital/auth when no user', () => {
    useAuth.mockReturnValue({ user: null })
    renderNavbar()
    const link = screen.getByText('🔐 Hospital Login')
    expect(link.getAttribute('href')).toBe('/hospital/auth')
  })

  it('dashboard link points to /hospital when user logged in', () => {
    useAuth.mockReturnValue({ user: { email: 'test@test.com' } })
    renderNavbar()
    const link = screen.getByText('📊 Dashboard')
    expect(link.getAttribute('href')).toBe('/hospital')
  })
})
