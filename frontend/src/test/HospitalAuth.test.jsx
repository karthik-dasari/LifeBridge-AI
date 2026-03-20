import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock AuthContext
const mockLogin = vi.fn()
const mockRegister = vi.fn()
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, register: mockRegister }),
}))

import HospitalAuth from '../pages/HospitalAuth'

describe('HospitalAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form by default', () => {
    render(<HospitalAuth />)
    expect(screen.getByText('Hospital Login')).toBeInTheDocument()
    expect(screen.getByText('🔐 Sign In')).toBeInTheDocument()
  })

  it('renders sign in subtitle', () => {
    render(<HospitalAuth />)
    expect(screen.getByText('Sign in to access your hospital dashboard')).toBeInTheDocument()
  })

  it('toggles to register form', () => {
    render(<HospitalAuth />)
    fireEvent.click(screen.getByText("Don't have an account? Register here"))
    expect(screen.getByText('Register Hospital')).toBeInTheDocument()
    expect(screen.getByText('📋 Register')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g., Apollo Hospital')).toBeInTheDocument()
  })

  it('toggles back to login from register', () => {
    render(<HospitalAuth />)
    fireEvent.click(screen.getByText("Don't have an account? Register here"))
    fireEvent.click(screen.getByText('Already registered? Sign in'))
    expect(screen.getByText('Hospital Login')).toBeInTheDocument()
  })

  it('calls login on submit in login mode', async () => {
    mockLogin.mockResolvedValue()
    render(<HospitalAuth />)

    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('🔐 Sign In'))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123')
      expect(mockNavigate).toHaveBeenCalledWith('/hospital')
    })
  })

  it('calls register on submit in register mode', async () => {
    mockRegister.mockResolvedValue()
    render(<HospitalAuth />)

    fireEvent.click(screen.getByText("Don't have an account? Register here"))
    fireEvent.change(screen.getByPlaceholderText('e.g., Apollo Hospital'), { target: { value: 'Apollo' } })
    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('📋 Register'))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@test.com', 'password123')
      expect(mockNavigate).toHaveBeenCalledWith('/hospital')
    })
  })

  it('shows error when hospital name is empty in register mode', async () => {
    render(<HospitalAuth />)

    fireEvent.click(screen.getByText("Don't have an account? Register here"))
    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('📋 Register'))

    await waitFor(() => {
      expect(screen.getByText('Hospital name is required')).toBeInTheDocument()
    })
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('shows friendly error for auth/invalid-credential', async () => {
    mockLogin.mockRejectedValue({ code: 'auth/invalid-credential' })
    render(<HospitalAuth />)

    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByText('🔐 Sign In'))

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })
  })

  it('shows friendly error for auth/email-already-in-use', async () => {
    mockRegister.mockRejectedValue({ code: 'auth/email-already-in-use' })
    render(<HospitalAuth />)

    fireEvent.click(screen.getByText("Don't have an account? Register here"))
    fireEvent.change(screen.getByPlaceholderText('e.g., Apollo Hospital'), { target: { value: 'Apollo' } })
    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('📋 Register'))

    await waitFor(() => {
      expect(screen.getByText('This email is already registered')).toBeInTheDocument()
    })
  })

  it('shows friendly error for auth/weak-password', async () => {
    mockLogin.mockRejectedValue({ code: 'auth/weak-password' })
    render(<HospitalAuth />)

    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: '123' } })
    fireEvent.click(screen.getByText('🔐 Sign In'))

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })
  })

  it('shows friendly error for auth/invalid-email', async () => {
    mockLogin.mockRejectedValue({ code: 'auth/invalid-email' })
    render(<HospitalAuth />)

    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'bad@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('🔐 Sign In'))

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })
  })

  it('shows friendly error for auth/too-many-requests', async () => {
    mockLogin.mockRejectedValue({ code: 'auth/too-many-requests' })
    render(<HospitalAuth />)

    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('🔐 Sign In'))

    await waitFor(() => {
      expect(screen.getByText('Too many attempts. Try again later')).toBeInTheDocument()
    })
  })

  it('shows generic error for unknown code', async () => {
    mockLogin.mockRejectedValue({ message: 'Something unknown happened' })
    render(<HospitalAuth />)

    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('🔐 Sign In'))

    await waitFor(() => {
      expect(screen.getByText('Something unknown happened')).toBeInTheDocument()
    })
  })

  it('shows default fallback error when no code or message', async () => {
    mockLogin.mockRejectedValue({})
    render(<HospitalAuth />)

    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('🔐 Sign In'))

    await waitFor(() => {
      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    let resolveLogin
    mockLogin.mockImplementation(() => new Promise((resolve) => { resolveLogin = resolve }))
    render(<HospitalAuth />)

    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('🔐 Sign In'))

    expect(screen.getByText('Please wait...')).toBeInTheDocument()

    resolveLogin()
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/hospital')
    })
  })

  it('clears error on toggle', async () => {
    mockLogin.mockRejectedValue({ code: 'auth/invalid-credential' })
    render(<HospitalAuth />)

    fireEvent.change(screen.getByPlaceholderText('hospital@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByText('🔐 Sign In'))

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Don't have an account? Register here"))
    expect(screen.queryByText('Invalid email or password')).not.toBeInTheDocument()
  })

  it('does not show hospital name field in login mode', () => {
    render(<HospitalAuth />)
    expect(screen.queryByPlaceholderText('e.g., Apollo Hospital')).not.toBeInTheDocument()
  })
})
