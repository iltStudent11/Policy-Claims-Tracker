import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterPage from './RegisterPage'
import { useAuth } from '../context/AuthContext'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

afterEach(() => {
  cleanup()
})

describe('RegisterPage role selector', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('hides admin option for non-admin users', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('option', { name: 'Adjuster' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('shows admin option for admin users', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        _id: 'admin-1',
        name: 'Avery Admin',
        email: 'admin@test.local',
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
      token: 'test-token',
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument()
  })

  it('shows validation error when name includes numbers or special characters', () => {
    const registerMock = vi.fn()
    mockedUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      register: registerMock,
      updateProfile: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John1!' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Register' }))

    expect(screen.getByText('Name may only contain letters and spaces.')).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('shows validation error for invalid email format', () => {
    const registerMock = vi.fn()
    mockedUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      register: registerMock,
      updateProfile: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John Doe' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@domain' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Register' }))

    expect(screen.getByText('Enter a valid email address (example: name@example.com).')).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })
})
