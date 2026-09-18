import { useEffect, useMemo, useState, type FormEvent } from 'react'
import api from '../api'
import PageLinks from '../components/PageLinks'
import { useAuth } from '../context/AuthContext'
import type { User, UserRole } from '../types'
import { getApiErrorMessage } from '../utils/apiError'

interface UsersResponse {
  users: User[]
}

interface UserResponse {
  user: User
}

const namePattern = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/

const UsersPage = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('adjuster')

  const editingUser = useMemo(
    () => users.find((existingUser) => existingUser._id === editingId) ?? null,
    [editingId, users],
  )

  const fetchUsers = async () => {
    if (!isAdmin) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.get<UsersResponse>('/users')
      setUsers(response.data.users)
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Unable to load users. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchUsers()
  }, [isAdmin])

  useEffect(() => {
    if (!success) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess(null)
    }, 3000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [success])

  const startEditing = (nextUser: User) => {
    setEditingId(nextUser._id)
    setName(nextUser.name)
    setEmail(nextUser.email)
    setRole(nextUser.role)
    setError(null)
    setSuccess(null)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setName('')
    setEmail('')
    setRole('adjuster')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editingId) {
      return
    }

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!namePattern.test(trimmedName)) {
      setError('Name may only contain letters and spaces.')
      return
    }

    if (!emailPattern.test(trimmedEmail)) {
      setError('Enter a valid email address (example: name@example.com).')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.put<UserResponse>(`/users/${editingId}`, {
        name: trimmedName,
        email: trimmedEmail,
        role,
      })

      setUsers((current) =>
        current.map((existingUser) =>
          existingUser._id === editingId ? response.data.user : existingUser,
        ),
      )

      setSuccess('User updated successfully.')
      cancelEditing()
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Unable to update user. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (targetUser: User) => {
    const confirmed = window.confirm(`Delete user ${targetUser.name}? This action cannot be undone.`)

    if (!confirmed) {
      return
    }

    setDeletingId(targetUser._id)
    setError(null)
    setSuccess(null)

    try {
      await api.delete(`/users/${targetUser._id}`)
      setUsers((current) => current.filter((existingUser) => existingUser._id !== targetUser._id))

      if (editingId === targetUser._id) {
        cancelEditing()
      }

      setSuccess('User deleted successfully.')
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Unable to delete user. Please try again.'))
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <main className="claims-page">
        <header className="claims-header">
          <div>
            <h1>Users</h1>
            <p className="claims-subtitle">Admin access required.</p>
          </div>
        </header>
        <p className="claims-error">Only admins can view and edit user accounts.</p>
        <PageLinks
          links={[
            { to: '/', label: 'Dashboard' },
            { to: '/profile', label: 'Profile' },
          ]}
        />
      </main>
    )
  }

  return (
    <main className="claims-page">
      <header className="claims-header">
        <div>
          <h1>Users</h1>
          <p className="claims-subtitle">View and edit all other user accounts.</p>
        </div>
      </header>

      {error ? <p className="claims-error">{error}</p> : null}
      {success ? <p className="claims-success">{success}</p> : null}

      {editingUser ? (
        <section className="claims-form-panel" aria-label="Edit user form">
          <h2>Edit User</h2>
          <form className="claims-form" onSubmit={handleSubmit}>
            <label htmlFor="name">
              Name
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                pattern="[A-Za-z]+(?:\s+[A-Za-z]+)*"
                title="Name may only contain letters and spaces."
                required
                disabled={saving}
              />
            </label>

            <label htmlFor="email">
              Email
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                pattern="[^\s@]+@[^\s@]+\.[A-Za-z]{2,}"
                title="Enter a valid email address (example: name@example.com)."
                required
                disabled={saving}
              />
            </label>

            <label htmlFor="role">
              Role
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                required
                disabled={saving}
              >
                <option value="adjuster">Adjuster</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <div className="claim-status-controls">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={cancelEditing} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="claims-table-wrap" aria-label="Users table">
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table className="claims-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5}>No other user accounts found.</td>
                </tr>
              ) : (
                users.map((existingUser) => (
                  <tr key={existingUser._id}>
                    <td>{existingUser.name}</td>
                    <td>{existingUser.email}</td>
                    <td>{existingUser.role}</td>
                    <td>{new Date(existingUser.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="users-action-buttons">
                      <button
                        className="users-action-button"
                        type="button"
                        onClick={() => startEditing(existingUser)}
                        disabled={deletingId === existingUser._id}
                      >
                        Edit
                      </button>
                      <button
                        className="users-action-button users-action-button-delete"
                        type="button"
                        onClick={() => void handleDeleteUser(existingUser)}
                        disabled={deletingId === existingUser._id || existingUser._id === user?._id}
                        title={
                          existingUser._id === user?._id ? 'You cannot delete your own account.' : undefined
                        }
                      >
                        {deletingId === existingUser._id ? 'Deleting...' : 'Delete'}
                      </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>

      <PageLinks
        links={[
          { to: '/', label: 'Dashboard' },
          { to: '/claims', label: 'Claims' },
          { to: '/policies', label: 'Policies' },
          { to: '/profile', label: 'Profile' },
        ]}
      />
    </main>
  )
}

export default UsersPage
