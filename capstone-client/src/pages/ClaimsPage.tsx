import { AxiosError } from 'axios'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import PageLinks from '../components/PageLinks'
import type { Claim, ClaimStatus, PaginatedResponse, Policy } from '../types'

interface ApiErrorResponse {
  message?: string
}

interface ClaimResponse {
  data: Claim
}

interface PoliciesResponse {
  data: Policy[]
}

const CLAIM_STATUSES: ClaimStatus[] = ['submitted', 'under-review', 'approved', 'denied', 'closed']

const formatStatusLabel = (status: string): string => {
  return status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const formatPolicyLabel = (policy: Policy): string => {
  return `${policy.policyNumber} — ${policy.holderName}`
}

const ClaimsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [claims, setClaims] = useState<Claim[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingClaims, setLoadingClaims] = useState(true)
  const [loadingPolicies, setLoadingPolicies] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formPolicyId, setFormPolicyId] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formIncidentDate, setFormIncidentDate] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const state = location.state as { successMessage?: string } | null
    if (state?.successMessage) {
      setSuccess(state.successMessage)
      navigate(location.pathname, { replace: true })
    }
  }, [location.pathname, location.state, navigate])

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

  useEffect(() => {
    const fetchPolicies = async () => {
      setLoadingPolicies(true)
      try {
        const response = await api.get<PoliciesResponse>('/policies', {
          params: { page: 1, limit: 100 },
        })
        setPolicies(response.data.data)
      } catch (caughtError) {
        const requestError = caughtError as AxiosError<ApiErrorResponse>
        setError(requestError.response?.data?.message ?? 'Failed to load policies.')
      } finally {
        setLoadingPolicies(false)
      }
    }

    void fetchPolicies()
  }, [])

  useEffect(() => {
    const fetchClaims = async () => {
      setLoadingClaims(true)
      setError(null)

      try {
        const response = await api.get<PaginatedResponse<Claim>>('/claims', {
          params: {
            page,
            limit: 10,
            status: statusFilter || undefined,
            search: search.trim() || undefined,
          },
        })

        setClaims(response.data.data)
        setTotalPages(Math.max(response.data.pagination.totalPages, 1))
      } catch (caughtError) {
        const requestError = caughtError as AxiosError<ApiErrorResponse>
        setError(requestError.response?.data?.message ?? 'Failed to load claims.')
      } finally {
        setLoadingClaims(false)
      }
    }

    void fetchClaims()
  }, [page, search, statusFilter])

  const canGoPrevious = page > 1
  const canGoNext = page < totalPages

  const policyOptions = useMemo(
    () => policies.map((policy) => ({ value: policy._id, label: formatPolicyLabel(policy) })),
    [policies],
  )

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleCreateClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setSuccess(null)

    if (!formPolicyId || !formDescription || !formIncidentDate || !formAmount) {
      setFormError('All fields are required.')
      return
    }

    const amountValue = Number(formAmount)
    if (Number.isNaN(amountValue) || amountValue < 0) {
      setFormError('Amount must be a valid number greater than or equal to 0.')
      return
    }

    setSubmitting(true)

    try {
      await api.post<ClaimResponse>('/claims', {
        policy: formPolicyId,
        description: formDescription.trim(),
        incidentDate: formIncidentDate,
        amount: amountValue,
      })

      setFormPolicyId('')
      setFormDescription('')
      setFormIncidentDate('')
      setFormAmount('')
      setShowForm(false)
      setPage(1)
      setSuccess('Claim created successfully.')

      const refreshed = await api.get<PaginatedResponse<Claim>>('/claims', {
        params: {
          page: 1,
          limit: 10,
          status: statusFilter || undefined,
          search: search.trim() || undefined,
        },
      })

      setClaims(refreshed.data.data)
      setTotalPages(Math.max(refreshed.data.pagination.totalPages, 1))
    } catch (caughtError) {
      const requestError = caughtError as AxiosError<ApiErrorResponse>
      setFormError(requestError.response?.data?.message ?? 'Failed to create claim.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="claims-page">
      <header className="claims-header">
        <div>
          <h1>Claims</h1>
          <p className="claims-subtitle">View and manage all claims.</p>
        </div>
        <button type="button" className="claims-new-button" onClick={() => setShowForm((current) => !current)}>
          {showForm ? 'Cancel' : 'New Claim'}
        </button>
      </header>

      {showForm ? (
        <section className="claims-form-panel" aria-label="New claim form">
          <h2>New Claim</h2>
          <form className="claims-form" onSubmit={handleCreateClaim}>
            <label htmlFor="policy">
              Policy
              <select
                id="policy"
                value={formPolicyId}
                onChange={(event) => setFormPolicyId(event.target.value)}
                required
                disabled={loadingPolicies || submitting}
              >
                <option value="">Select a policy</option>
                {policyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="description">
              Description
              <input
                id="description"
                type="text"
                value={formDescription}
                onChange={(event) => setFormDescription(event.target.value)}
                required
                disabled={submitting}
              />
            </label>

            <label htmlFor="incidentDate">
              Incident Date
              <input
                id="incidentDate"
                type="date"
                value={formIncidentDate}
                onChange={(event) => setFormIncidentDate(event.target.value)}
                required
                disabled={submitting}
              />
            </label>

            <label htmlFor="amount">
              Amount
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formAmount}
                onChange={(event) => setFormAmount(event.target.value)}
                required
                disabled={submitting}
              />
            </label>

            {formError ? <p className="claims-error">{formError}</p> : null}

            <button type="submit" disabled={submitting || loadingPolicies}>
              {submitting ? 'Creating...' : 'Create Claim'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="claims-filters" aria-label="Claims filters">
        <label htmlFor="statusFilter">
          Status
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) => handleStatusChange(event.target.value)}
          >
            <option value="">All statuses</option>
            {CLAIM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="searchFilter">
          Search
          <input
            id="searchFilter"
            type="text"
            placeholder="Search claim number or description"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
          />
        </label>
      </section>

      {error ? <p className="claims-error">{error}</p> : null}
      {success ? <p className="claims-success">{success}</p> : null}

      <section className="claims-table-wrap" aria-label="Claims table">
        {loadingClaims ? (
          <p>Loading claims...</p>
        ) : (
          <table className="claims-table">
            <thead>
              <tr>
                <th>Claim Number</th>
                <th>Policy</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Incident Date</th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={6}>No claims found.</td>
                </tr>
              ) : (
                claims.map((claim) => {
                  const policy = typeof claim.policy === 'string' ? null : claim.policy
                  return (
                    <tr key={claim._id}>
                      <td>
                        <Link to={`/claims/${claim._id}`}>{claim.claimNumber}</Link>
                      </td>
                      <td>{policy ? `${policy.policyNumber} (${policy.holderName})` : '—'}</td>
                      <td>{claim.description}</td>
                      <td>
                        {claim.amount.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                        })}
                      </td>
                      <td>{formatStatusLabel(claim.status)}</td>
                      <td>{new Date(claim.incidentDate).toLocaleDateString()}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </section>

      <nav className="claims-pagination" aria-label="Claims pagination">
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
          { to: '/policies', label: 'Go to policies' },
        ]}
      />
    </main>
  )
}

export default ClaimsPage
