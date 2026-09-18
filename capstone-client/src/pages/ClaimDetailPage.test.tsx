import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ClaimDetailPage from './ClaimDetailPage'
import { useAuth } from '../context/AuthContext'
import api from '../api'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedApiGet = vi.mocked(api.get)

const buildClaimResponse = (assignedToId: string) => ({
  data: {
    data: {
      _id: 'claim-1',
      claimNumber: 'CLM-1001',
      policy: {
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
      description: 'Rear-end collision damage',
      incidentDate: '2026-08-01T00:00:00.000Z',
      amount: 1250,
      status: 'submitted',
      assignedTo: {
        _id: assignedToId,
        name: 'Assigned Adjuster',
        email: 'assigned@test.local',
        role: 'adjuster',
        createdAt: new Date().toISOString(),
      },
      notes: [],
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    },
  },
})

const renderClaimDetailPage = () => {
  render(
    <MemoryRouter initialEntries={['/claims/claim-1']}>
      <Routes>
        <Route path="/claims/:id" element={<ClaimDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ClaimDetailPage role visibility', () => {
  beforeEach(() => {
    mockedApiGet.mockResolvedValue(buildClaimResponse('adjuster-assigned'))
  })

  it('hides update/delete controls for non-assigned adjusters', async () => {
    mockedUseAuth.mockReturnValue({
      user: {
        _id: 'adjuster-other',
        name: 'Other Adjuster',
        email: 'other@test.local',
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

    renderClaimDetailPage()

    expect(await screen.findByRole('heading', { name: 'CLM-1001' })).toBeInTheDocument()
    expect(screen.getByText('Only admins or the assigned adjuster can update this claim.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Claim' })).not.toBeInTheDocument()
  })

  it('shows update/delete controls for admins', async () => {
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

    renderClaimDetailPage()

    expect(await screen.findByRole('heading', { name: 'CLM-1001' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Claim' })).toBeInTheDocument()
  })
})
