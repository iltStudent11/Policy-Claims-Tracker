import type { PropsWithChildren } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const { token, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p>Loading...</p>
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children ?? <Outlet />
}

export default ProtectedRoute
