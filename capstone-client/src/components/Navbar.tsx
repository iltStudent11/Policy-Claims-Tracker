import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="app-navbar">
      <div className="app-navbar-brand" aria-label="Application brand">
        <span className="app-navbar-logo" aria-hidden="true" />
        <span className="app-navbar-name">Policy Claims Tracker</span>
      </div>

      <nav className="app-navbar-links" aria-label="Primary navigation">
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? 'app-navbar-link app-navbar-link-active' : 'app-navbar-link')}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/claims"
          className={({ isActive }) =>
            isActive ? 'app-navbar-link app-navbar-link-active' : 'app-navbar-link'
          }
        >
          Claims
        </NavLink>
        <NavLink
          to="/policies"
          className={({ isActive }) =>
            isActive ? 'app-navbar-link app-navbar-link-active' : 'app-navbar-link'
          }
        >
          Policies
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? 'app-navbar-link app-navbar-link-active' : 'app-navbar-link'
          }
        >
          Profile
        </NavLink>
      </nav>

      <div className="app-navbar-user" aria-label="Current user">
        <div className="app-navbar-user-meta">
          <span className="app-navbar-user-name">{user?.name ?? 'User'}</span>
          <span className="app-navbar-role-badge">{user?.role ?? 'unknown'}</span>
        </div>
        <button type="button" className="app-navbar-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  )
}

export default Navbar
