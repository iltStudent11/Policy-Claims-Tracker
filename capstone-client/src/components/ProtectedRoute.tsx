import type { PropsWithChildren } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'

const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const { token, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p>Loading...</p>
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <div className="protected-layout">
      <Navbar />
      <div className="protected-content">{children ?? <Outlet />}</div>
    </div>
  )
}

export default ProtectedRoute
