import { AxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import type { ClaimStatus, DashboardResponse, DashboardStats } from '../types'

interface ApiErrorResponse {
  message?: string
}

const STATUS_ORDER: ClaimStatus[] = ['submitted', 'under-review', 'approved', 'denied', 'closed']

const STATUS_CLASS_MAP: Record<ClaimStatus, string> = {
  submitted: 'status-submitted',
  'under-review': 'status-under-review',
  approved: 'status-approved',
  denied: 'status-denied',
  closed: 'status-closed',
}

const formatStatusLabel = (status: string): string => {
  return status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const DashboardPage = () => {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await api.get<DashboardResponse>('/dashboard')
        setDashboard(response.data.data)
      } catch (caughtError) {
        const requestError = caughtError as AxiosError<ApiErrorResponse>
        const message = requestError.response?.data?.message ?? 'Failed to load dashboard data.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void fetchDashboard()
  }, [])

  const statusRows = useMemo(() => {
    const entries = STATUS_ORDER.map((status) => ({
      status,
      count: dashboard?.claimsByStatus[status] ?? 0,
    }))

    const maxCount = Math.max(...entries.map((entry) => entry.count), 1)

    return entries.map((entry) => ({
      ...entry,
      width: Math.max((entry.count / maxCount) * 100, entry.count > 0 ? 10 : 0),
    }))
  }, [dashboard])

  if (loading) {
    return <main className="dashboard-page">Loading dashboard...</main>
  }

  if (error || !dashboard) {
    return <main className="dashboard-page dashboard-error">{error ?? 'Dashboard unavailable.'}</main>
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <Link to="/claims" className="dashboard-link-button">
          Claims
        </Link>
      </header>

      <section className="summary-grid" aria-label="Summary stats">
        <article className="stat-card">
          <h2>Total Claims</h2>
          <p>{dashboard.totalClaims}</p>
        </article>
        <article className="stat-card">
          <h2>Total Policies</h2>
          <p>{dashboard.totalPolicies}</p>
        </article>
        <article className="stat-card">
          <h2>Total Users</h2>
          <p>{dashboard.totalUsers}</p>
        </article>
        <article className="stat-card">
          <h2>Total Claim Amount</h2>
          <p>
            {dashboard.totalClaimAmount.toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
            })}
          </p>
        </article>
      </section>

      <div className="dashboard-lower-grid">
        <section className="dashboard-panel" aria-label="Claims by status">
          <h2>Claims by Status</h2>
          <div className="status-chart">
            {statusRows.map((row) => (
              <div key={row.status} className={`status-row ${STATUS_CLASS_MAP[row.status]}`}>
                <span className="status-label">{formatStatusLabel(row.status)}</span>
                <div className="status-bar-track">
                  <div className="status-bar-fill" style={{ width: `${row.width}%` }} />
                </div>
                <span className="status-count">{row.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel" aria-label="Recent claims">
          <h2>Recent Claims</h2>
          <table className="claims-table">
            <thead>
              <tr>
                <th>Claim #</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentClaims.slice(0, 5).map((claim) => (
                <tr key={claim._id}>
                  <td>
                    <Link to={`/claims/${claim._id}`}>{claim.claimNumber}</Link>
                  </td>
                  <td>
                    <span className={`status-badge ${STATUS_CLASS_MAP[claim.status]}`}>
                      {formatStatusLabel(claim.status)}
                    </span>
                  </td>
                  <td>
                    {claim.amount.toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                    })}
                  </td>
                  <td>{new Date(claim.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}

export default DashboardPage
