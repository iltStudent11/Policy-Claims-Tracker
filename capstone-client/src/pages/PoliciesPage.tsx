import { AxiosError } from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import PageHeaderActions from '../components/PageHeaderActions'
import PageLinks from '../components/PageLinks'
import type { PaginatedResponse, Policy, PolicyStatus, PolicyType } from '../types'

interface ApiErrorResponse {
  message?: string
}

interface PolicyResponse {
  data: Policy
}

const POLICY_TYPES: PolicyType[] = ['auto', 'home', 'life']
const POLICY_STATUSES: PolicyStatus[] = ['active', 'expired', 'cancelled']

const formatLabel = (value: string): string => {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const PoliciesPage = () => {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [policyNumber, setPolicyNumber] = useState('')
  const [holderName, setHolderName] = useState('')
  const [type, setType] = useState<PolicyType>('auto')
  const [premium, setPremium] = useState('')
  const [status, setStatus] = useState<PolicyStatus>('active')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [expirationDate, setExpirationDate] = useState('')

  const fetchPolicies = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.get<PaginatedResponse<Policy>>('/policies', {
        params: {
          page,
          limit: 10,
          type: typeFilter || undefined,
          search: search.trim() || undefined,
        },
      })

      setPolicies(response.data.data)
      setTotalPages(Math.max(response.data.pagination.totalPages, 1))
    } catch (caughtError) {
      const requestError = caughtError as AxiosError<ApiErrorResponse>
      setError(requestError.response?.data?.message ?? 'Failed to load policies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPolicies()
  }, [page, search, typeFilter])

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

  const handleTypeChange = (nextType: string) => {
    setTypeFilter(nextType)
    setPage(1)
  }

  const handleSearchChange = (nextSearch: string) => {
    setSearch(nextSearch)
    setPage(1)
  }

  const resetForm = () => {
    setPolicyNumber('')
    setHolderName('')
    setType('auto')
    setPremium('')
    setStatus('active')
    setEffectiveDate('')
    setExpirationDate('')
  }

  const handleCreatePolicy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const premiumValue = Number(premium)

    if (Number.isNaN(premiumValue) || premiumValue < 0) {
      setError('Premium must be a valid number greater than or equal to 0.')
      return
    }

    setSubmitting(true)

    try {
      await api.post<PolicyResponse>('/policies', {
        policyNumber: policyNumber.trim(),
        holderName: holderName.trim(),
        type,
        premium: premiumValue,
        status,
        effectiveDate,
        expirationDate,
      })

      resetForm()
      setShowForm(false)
      setSuccess('Policy created successfully.')
      setPage(1)

      const response = await api.get<PaginatedResponse<Policy>>('/policies', {
        params: {
          page: 1,
          limit: 10,
          type: typeFilter || undefined,
          search: search.trim() || undefined,
        },
      })

      setPolicies(response.data.data)
      setTotalPages(Math.max(response.data.pagination.totalPages, 1))
    } catch (caughtError) {
      const requestError = caughtError as AxiosError<ApiErrorResponse>
      setError(requestError.response?.data?.message ?? 'Failed to create policy.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePolicy = async (id: string) => {
    const confirmed = window.confirm('Delete this policy? This action cannot be undone.')
    if (!confirmed) {
      return
    }

    setDeletingId(id)
    setError(null)
    setSuccess(null)

    try {
      await api.delete(`/policies/${id}`)
      setSuccess('Policy deleted successfully.')

      const nextPage = policies.length === 1 && page > 1 ? page - 1 : page
      setPage(nextPage)

      if (nextPage === page) {
        await fetchPolicies()
      }
    } catch (caughtError) {
      const requestError = caughtError as AxiosError<ApiErrorResponse>
      setError(requestError.response?.data?.message ?? 'Failed to delete policy.')
    } finally {
      setDeletingId(null)
    }
  }

  const canGoPrevious = page > 1
  const canGoNext = page < totalPages

  return (
    <main className="policies-page">
      <header className="policies-header">
        <div>
          <h1>Policies</h1>
          <p className="claims-subtitle">View and manage all policies.</p>
        </div>
        <PageHeaderActions>
          <button type="button" className="claims-new-button" onClick={() => setShowForm((current) => !current)}>
            {showForm ? 'Cancel' : 'New Policy'}
          </button>
          <Link to="/claims" className="dashboard-link-button">
            Go to claims
          </Link>
        </PageHeaderActions>
      </header>

      {showForm ? (
        <section className="claims-form-panel" aria-label="New policy form">
          <h2>New Policy</h2>
          <form className="policies-form" onSubmit={handleCreatePolicy}>
            <label htmlFor="policyNumber">
              Policy Number
              <input
                id="policyNumber"
                type="text"
                value={policyNumber}
                onChange={(event) => setPolicyNumber(event.target.value)}
                required
                disabled={submitting}
              />
            </label>

            <label htmlFor="holderName">
              Holder
              <input
                id="holderName"
                type="text"
                value={holderName}
                onChange={(event) => setHolderName(event.target.value)}
                required
                disabled={submitting}
              />
            </label>

            <label htmlFor="type">
              Type
              <select
                id="type"
                value={type}
                onChange={(event) => setType(event.target.value as PolicyType)}
                required
                disabled={submitting}
              >
                {POLICY_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="premium">
              Premium
              <input
                id="premium"
                type="number"
                min="0"
                step="0.01"
                value={premium}
                onChange={(event) => setPremium(event.target.value)}
                required
                disabled={submitting}
              />
            </label>

            <label htmlFor="status">
              Status
              <select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value as PolicyStatus)}
                required
                disabled={submitting}
              >
                {POLICY_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="effectiveDate">
              Effective Date
              <input
                id="effectiveDate"
                type="date"
                value={effectiveDate}
                onChange={(event) => setEffectiveDate(event.target.value)}
                required
                disabled={submitting}
              />
            </label>

            <label htmlFor="expirationDate">
              Expiration Date
              <input
                id="expirationDate"
                type="date"
                value={expirationDate}
                onChange={(event) => setExpirationDate(event.target.value)}
                required
                disabled={submitting}
              />
            </label>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Policy'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="policies-filters" aria-label="Policies filters">
        <label htmlFor="typeFilter">
          Type
          <select id="typeFilter" value={typeFilter} onChange={(event) => handleTypeChange(event.target.value)}>
            <option value="">All types</option>
            {POLICY_TYPES.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="policySearch">
          Search
          <input
            id="policySearch"
            type="text"
            placeholder="Search policy number or holder"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
          />
        </label>
      </section>

      {error ? <p className="claims-error">{error}</p> : null}
      {success ? <p className="claims-success">{success}</p> : null}

      <section className="claims-table-wrap" aria-label="Policies table">
        {loading ? (
          <p>Loading policies...</p>
        ) : (
          <table className="claims-table">
            <thead>
              <tr>
                <th>Policy Number</th>
                <th>Holder</th>
                <th>Type</th>
                <th>Premium</th>
                <th>Status</th>
                <th>Effective / Expiration</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={7}>No policies found.</td>
                </tr>
              ) : (
                policies.map((policy) => (
                  <tr key={policy._id}>
                    <td>{policy.policyNumber}</td>
                    <td>{policy.holderName}</td>
                    <td>{formatLabel(policy.type)}</td>
                    <td>
                      {policy.premium.toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </td>
                    <td>{formatLabel(policy.status)}</td>
                    <td>
                      {new Date(policy.effectiveDate).toLocaleDateString()} /{' '}
                      {new Date(policy.expirationDate).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="policy-delete-button"
                        onClick={() => handleDeletePolicy(policy._id)}
                        disabled={deletingId === policy._id}
                      >
                        {deletingId === policy._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>

      <nav className="claims-pagination" aria-label="Policies pagination">
        <button type="button" onClick={() => setPage((current) => current - 1)} disabled={!canGoPrevious}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button type="button" onClick={() => setPage((current) => current + 1)} disabled={!canGoNext}>
          Next
        </button>
      </nav>

      <PageLinks
        links={[
          { to: '/dashboard', label: 'Back to dashboard' },
          { to: '/claims', label: 'Go to claims' },
        ]}
      />
    </main>
  )
}

export default PoliciesPage
