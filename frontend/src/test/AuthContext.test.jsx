import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/AuthContext'

// Mock firebase
vi.mock('../firebase', () => ({
  auth: { currentUser: null },
  default: {},
}))

// Mock firebase/auth
const mockOnAuthStateChanged = vi.fn()
const mockSignInWithEmailAndPassword = vi.fn()
const mockCreateUserWithEmailAndPassword = vi.fn()
const mockSignOut = vi.fn()

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
  signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args) => mockSignOut(...args),
}))

function TestConsumer() {
  const { user, loading, login, register, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <button onClick={() => login('a@b.com', 'pass')}>login</button>
      <button onClick={() => register('a@b.com', 'pass')}>register</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnAuthStateChanged.mockImplementation((auth, cb) => {
      cb(null) // no user
      return vi.fn() // unsubscribe
    })
  })

  it('provides user=null initially after auth check', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(screen.getByTestId('loading').textContent).toBe('false')
  })

  it('provides user when auth state changes', () => {
    mockOnAuthStateChanged.mockImplementation((auth, cb) => {
      cb({ email: 'test@test.com' })
      return vi.fn()
    })
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    expect(screen.getByTestId('user').textContent).toBe('test@test.com')
  })

  it('login calls signInWithEmailAndPassword', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({})
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await act(async () => {
      screen.getByText('login').click()
    })
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalled()
  })

  it('register calls createUserWithEmailAndPassword', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValue({})
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await act(async () => {
      screen.getByText('register').click()
    })
    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled()
  })

  it('logout calls signOut', async () => {
    mockSignOut.mockResolvedValue()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await act(async () => {
      screen.getByText('logout').click()
    })
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('useAuth throws if used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within AuthProvider')
    consoleError.mockRestore()
  })
})
