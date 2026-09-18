import { useEffect, useState, type FormEvent } from 'react'
import PageLinks from '../components/PageLinks'
import { useAuth } from '../context/AuthContext'

const namePattern = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/

const ProfilePage = () => {
  const { user, updateProfile, loading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user])

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

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

    try {
      await updateProfile(trimmedName, trimmedEmail)
      setSuccess('Profile updated successfully.')
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to update profile. Please try again.'
      setError(message)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="profile-title">
        <h1 id="profile-title">Profile</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="name">
            Name
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              pattern="[A-Za-z]+(?:\s+[A-Za-z]+)*"
              title="Name may only contain letters and spaces."
              required
              disabled={loading}
            />
          </label>

          <label htmlFor="email">
            Email
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              pattern="[^\s@]+@[^\s@]+\.[A-Za-z]{2,}"
              title="Enter a valid email address (example: name@example.com)."
              required
              disabled={loading}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}
          {success ? <p className="claims-success">{success}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        <PageLinks
          links={[
            { to: '/', label: 'Dashboard' },
            { to: '/claims', label: 'Claims' },
            { to: '/policies', label: 'Policies' },
          ]}
        />
      </section>
    </main>
  )
}

export default ProfilePage
