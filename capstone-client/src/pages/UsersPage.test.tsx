import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UsersPage from './UsersPage'
import { useAuth } from '../context/AuthContext'
import api from '../api'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedApiGet = vi.mocked(api.get)
const mockedApiDelete = vi.mocked(api.delete)

describe('UsersPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    mockedApiGet.mockResolvedValue({
      data: {
        users: [
          {
            _id: 'user-2',
            name: 'Taylor Adjuster',
            email: 'adjuster@test.local',
            role: 'adjuster',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    })
  })

  it('shows access error for non-admin users', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        _id: 'user-1',
        name: 'Jordan Adjuster',
        email: 'jordan@test.local',
        role: 'adjuster',
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
        <UsersPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Only admins can view and edit user accounts.')).toBeInTheDocument()
  })

  it('shows user table for admins', async () => {
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
        <UsersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Taylor Adjuster')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('deletes a user when admin confirms', async () => {
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

    mockedApiDelete.mockResolvedValue({ data: { message: 'User deleted successfully' } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Taylor Adjuster')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockedApiDelete).toHaveBeenCalledWith('/users/user-2')
    })

    expect(screen.queryByText('Taylor Adjuster')).not.toBeInTheDocument()
  })

  it('disables delete for the current admin row', async () => {
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

    mockedApiGet.mockResolvedValueOnce({
      data: {
        users: [
          {
            _id: 'admin-1',
            name: 'Avery Admin',
            email: 'admin@test.local',
            role: 'admin',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            _id: 'user-2',
            name: 'Taylor Adjuster',
            email: 'adjuster@test.local',
            role: 'adjuster',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    })

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    )

    const adminRowText = await screen.findByText('Avery Admin')
    const adminRow = adminRowText.closest('tr')
    expect(adminRow).not.toBeNull()

    const adminDeleteButton = within(adminRow as HTMLTableRowElement).getByRole('button', {
      name: 'Delete',
    })

    expect(adminDeleteButton).toBeDisabled()
  })
})
