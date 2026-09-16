import { useEffect, useState, type FormEvent } from 'react'
import api from '../api'
import PageLinks from '../components/PageLinks'
import type { PaginatedResponse, Policy, PolicyStatus, PolicyType } from '../types'
import { getApiErrorMessage } from '../utils/apiError'

interface PolicyResponse {
  data: Policy
}

const POLICY_TYPES: PolicyType[] = ['auto', 'home', 'life']
const POLICY_STATUSES: PolicyStatus[] = ['active', 'expired', 'cancelled']
const POLICY_NUMBER_PREFIX = 'POL-'

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

  const [policyNumber, setPolicyNumber] = useState(POLICY_NUMBER_PREFIX)
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
      setError(getApiErrorMessage(caughtError, 'Unable to load policies. Please try again.'))
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
    setPolicyNumber(POLICY_NUMBER_PREFIX)
    setHolderName('')
    setType('auto')
    setPremium('')
    setStatus('active')
    setEffectiveDate('')
    setExpirationDate('')
  }

  const handlePolicyNumberChange = (value: string) => {
    const upperValue = value.toUpperCase()
    const sanitizedValue = upperValue.replace(/[^A-Z0-9-]/g, '')

    if (!sanitizedValue) {
      setPolicyNumber(POLICY_NUMBER_PREFIX)
      return
    }

    if (sanitizedValue.startsWith(POLICY_NUMBER_PREFIX)) {
      setPolicyNumber(sanitizedValue)
      return
    }

    const suffix = sanitizedValue.replace(/^POL-?/, '')
    setPolicyNumber(`${POLICY_NUMBER_PREFIX}${suffix}`)
  }

  const handleCreatePolicy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmedPolicyNumber = policyNumber.trim().toUpperCase()
    const policyNumberSuffix = trimmedPolicyNumber.replace(/^POL-/, '')
    const trimmedHolderName = holderName.trim()
    const premiumValue = Number(premium)
    const policyNumberPattern = /^POL-[A-Z0-9-]+$/
    const holderNamePattern = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/

    if (trimmedPolicyNumber.length < 3 || trimmedPolicyNumber.length > 30) {
      setError('Policy number must be between 3 and 30 characters.')
      return
    }

    if (!policyNumberSuffix) {
      setError('Policy number must include characters after POL-.')
      return
    }

    if (!policyNumberPattern.test(trimmedPolicyNumber)) {
      setError('Policy number can only contain letters, numbers, and hyphens.')
      return
    }

    if (trimmedHolderName.length < 2 || trimmedHolderName.length > 100) {
      setError('Holder name must be between 2 and 100 characters.')
      return
    }

    if (!holderNamePattern.test(trimmedHolderName)) {
      setError('Holder name may only contain letters, spaces, hyphens, and apostrophes.')
      return
    }

    if (Number.isNaN(premiumValue) || premiumValue < 0) {
      setError('Premium must be a valid number greater than or equal to 0.')
      return
    }

    if (!effectiveDate || !expirationDate) {
      setError('Effective and expiration dates are required.')
      return
    }

    if (new Date(expirationDate) <= new Date(effectiveDate)) {
      setError('Expiration date must be after effective date.')
      return
    }

    setSubmitting(true)

    try {
      await api.post<PolicyResponse>('/policies', {
        policyNumber: trimmedPolicyNumber,
        holderName: trimmedHolderName,
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
      setError(getApiErrorMessage(caughtError, 'Unable to create policy. Please try again.'))
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
      setError(getApiErrorMessage(caughtError, 'Unable to delete policy. Please try again.'))
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
        <button type="button" className="claims-new-button" onClick={() => setShowForm((current) => !current)}>
          {showForm ? 'Cancel' : 'New Policy'}
        </button>
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
                onChange={(event) => handlePolicyNumberChange(event.target.value)}
                maxLength={30}
                pattern="POL-[A-Za-z0-9-]+"
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
                maxLength={100}
                pattern="[A-Za-z]+([ '-][A-Za-z]+)*"
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
                max={expirationDate || undefined}
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
                min={effectiveDate || undefined}
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
          { to: '/', label: 'Dashboard' },
          { to: '/claims', label: 'Claims' },
        ]}
      />
    </main>
  )
}

export default PoliciesPage
