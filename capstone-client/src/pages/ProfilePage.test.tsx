import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from './ProfilePage'
import { useAuth } from '../context/AuthContext'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

afterEach(() => {
  cleanup()
})

describe('ProfilePage', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: {
        _id: 'user-1',
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
  })

  it('renders current name and email values', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )

    expect(screen.getByDisplayValue('Avery Admin')).toBeInTheDocument()
    expect(screen.getByDisplayValue('admin@test.local')).toBeInTheDocument()
  })

  it('shows validation error when email format is invalid', () => {
    const updateProfileMock = vi.fn()
    mockedUseAuth.mockReturnValue({
      user: {
        _id: 'user-1',
        name: 'Avery Admin',
        email: 'admin@test.local',
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
      token: 'test-token',
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      updateProfile: updateProfileMock,
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid@domain' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Save Profile' }))

    expect(screen.getByText('Enter a valid email address (example: name@example.com).')).toBeInTheDocument()
    expect(updateProfileMock).not.toHaveBeenCalled()
  })
})
