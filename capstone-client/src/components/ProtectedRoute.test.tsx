import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../context/AuthContext'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('redirects unauthenticated users to login', () => {
    render(
      <MemoryRouter initialEntries={['/claims']}>
        <Routes>
          <Route
            path="/claims"
            element={
              <ProtectedRoute>
                <div>Private Claims Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login Screen')).toBeInTheDocument()
    expect(screen.queryByText('Private Claims Content')).not.toBeInTheDocument()
  })
})
