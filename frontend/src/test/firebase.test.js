import { describe, it, expect, vi } from 'vitest'

// Mock firebase/app and firebase/auth before importing
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
}))
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
}))

describe('firebase.js', () => {
  it('exports auth and default app', async () => {
    const mod = await import('../firebase')
    expect(mod.auth).toBeDefined()
    expect(mod.default).toBeDefined()
  })

  it('initializes firebase app', async () => {
    const { initializeApp } = await import('firebase/app')
    await import('../firebase')
    expect(initializeApp).toHaveBeenCalled()
  })

  it('gets auth from firebase app', async () => {
    const { getAuth } = await import('firebase/auth')
    await import('../firebase')
    expect(getAuth).toHaveBeenCalled()
  })
})
