import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock child components
vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
}))

vi.mock('../components/Navbar', () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}))

vi.mock('../pages/UserPage', () => ({
  default: () => <div data-testid="user-page">UserPage</div>,
}))

vi.mock('../pages/HospitalDashboard', () => ({
  default: () => <div data-testid="hospital-dashboard">HospitalDashboard</div>,
}))

vi.mock('../pages/HospitalAuth', () => ({
  default: () => <div data-testid="hospital-auth">HospitalAuth</div>,
}))

import App from '../App'

describe('App', () => {
  it('renders Navbar and UserPage at root', () => {
    render(<App />)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    expect(screen.getByTestId('user-page')).toBeInTheDocument()
  })
})
