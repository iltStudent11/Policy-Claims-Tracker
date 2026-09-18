import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/

const LoginPage = () => {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim().toLowerCase()

    if (!emailPattern.test(trimmedEmail)) {
      setError('Enter a valid email address (example: name@example.com).')
      return
    }

    try {
      await login(trimmedEmail, password)
      navigate('/')
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to log in. Please try again.'
      setError(message)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <h1 id="login-title">Policy Claims Tracker</h1>
        <h2>Login</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
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
            />
          </label>

          <label htmlFor="password">
            Password
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-link-row">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
