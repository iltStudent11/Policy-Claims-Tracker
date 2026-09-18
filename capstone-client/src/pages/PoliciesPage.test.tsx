import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PoliciesPage from './PoliciesPage'
import { useAuth } from '../context/AuthContext'
import api from '../api'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedApiGet = vi.mocked(api.get)

const paginatedPoliciesResponse = {
  data: [
    {
      _id: 'policy-1',
      policyNumber: 'POL-1001',
      holderName: 'Mia Roberts',
      type: 'auto',
      premium: 900,
      status: 'active',
      effectiveDate: '2026-01-01T00:00:00.000Z',
      expirationDate: '2026-12-31T00:00:00.000Z',
      owner: 'owner-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  },
}

describe('PoliciesPage role visibility', () => {
  beforeEach(() => {
    mockedApiGet.mockResolvedValue({ data: paginatedPoliciesResponse })
  })

  it('hides admin controls for adjusters', async () => {
    mockedUseAuth.mockReturnValue({
      user: {
        _id: 'adjuster-1',
        name: 'Taylor Adjuster',
        email: 'adjuster@test.local',
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
        <PoliciesPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('POL-1001')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Policy' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows admin controls for admins', async () => {
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
        <PoliciesPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('POL-1001')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Policy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })
})
