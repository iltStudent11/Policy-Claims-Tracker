import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import PageLinks from '../components/PageLinks'
import { useAuth } from '../context/AuthContext'
import type { Claim, ClaimStatus } from '../types'
import { getApiErrorMessage } from '../utils/apiError'

interface ClaimResponse {
  data: Claim
}

const CLAIM_STATUSES: ClaimStatus[] = ['submitted', 'under-review', 'approved', 'denied', 'closed']

const formatStatusLabel = (status: string): string => {
  return status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const ClaimDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [claim, setClaim] = useState<Claim | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [statusValue, setStatusValue] = useState<ClaimStatus>('submitted')
  const [statusLoading, setStatusLoading] = useState(false)

  const [noteText, setNoteText] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)

  const [deleteLoading, setDeleteLoading] = useState(false)

  const policy = useMemo(() => {
    if (!claim || typeof claim.policy === 'string') {
      return null
    }

    return claim.policy
  }, [claim])

  const assignedUser = useMemo(() => {
    if (!claim || !claim.assignedTo || typeof claim.assignedTo === 'string') {
      return null
    }

    return claim.assignedTo
  }, [claim])

  const canEditClaim = useMemo(() => {
    if (!user || !claim) {
      return false
    }

    if (user.role === 'admin') {
      return true
    }

    if (!claim.assignedTo || typeof claim.assignedTo === 'string') {
      return false
    }

    return claim.assignedTo._id === user._id
  }, [claim, user])

  const canDeleteClaim = user?.role === 'admin'

  const fetchClaim = async () => {
    if (!id) {
      setError('Invalid claim ID.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.get<ClaimResponse>(`/claims/${id}`)
      setClaim(response.data.data)
      setStatusValue(response.data.data.status)
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Unable to load claim details. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchClaim()
  }, [id])

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

  const handleStatusUpdate = async () => {
    if (!claim || statusValue === claim.status || !canEditClaim) {
      return
    }

    setStatusLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.put<ClaimResponse>(`/claims/${claim._id}`, {
        status: statusValue,
      })
      setClaim(response.data.data)
      setStatusValue(response.data.data.status)
      setSuccess('Claim status updated.')
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Unable to update status. Please try again.'))
    } finally {
      setStatusLoading(false)
    }
  }

  const handleAddNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!claim || !noteText.trim()) {
      return
    }

    setNoteLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.post<ClaimResponse>(`/claims/${claim._id}/notes`, {
        text: noteText.trim(),
      })
      setClaim(response.data.data)
      setNoteText('')
      setSuccess('Note added.')
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Unable to add note. Please try again.'))
    } finally {
      setNoteLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!claim || !canDeleteClaim) {
      return
    }

    const confirmed = window.confirm('Delete this claim? This action cannot be undone.')
    if (!confirmed) {
      return
    }

    setDeleteLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await api.delete(`/claims/${claim._id}`)
      navigate('/claims', { state: { successMessage: 'Claim deleted successfully.' } })
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Unable to delete claim. Please try again.'))
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return <main className="claim-detail-page">Loading claim...</main>
  }

  if (error && !claim) {
    return (
      <main className="claim-detail-page">
        <p className="claims-error">{error}</p>
        <PageLinks
          links={[
            { to: '/claims', label: 'Claims' },
            { to: '/policies', label: 'Policies' },
          ]}
        />
      </main>
    )
  }

  if (!claim) {
    return (
      <main className="claim-detail-page">
        <p className="claims-error">Claim not found.</p>
        <PageLinks
          links={[
            { to: '/claims', label: 'Claims' },
            { to: '/policies', label: 'Policies' },
          ]}
        />
      </main>
    )
  }

  return (
    <main className="claim-detail-page">
      <header className="claim-detail-header">
        <div>
          <h1>{claim.claimNumber}</h1>
          <p className="claims-subtitle">Claim detail</p>
        </div>
        <PageLinks
          links={[
            { to: '/claims', label: 'Claims' },
            { to: '/policies', label: 'Policies' },
          ]}
        />
      </header>

      {error ? <p className="claims-error">{error}</p> : null}
      {success ? <p className="claims-success">{success}</p> : null}

      <section className="claim-detail-panel" aria-label="Claim information">
        <h2>Claim Information</h2>
        <dl className="claim-detail-grid">
          <div>
            <dt>Claim Number</dt>
            <dd>{claim.claimNumber}</dd>
          </div>
          <div>
            <dt>Policy</dt>
            <dd>{policy ? `${policy.policyNumber} (${policy.holderName})` : '—'}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>
              {claim.amount.toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD',
              })}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{formatStatusLabel(claim.status)}</dd>
          </div>
          <div>
            <dt>Incident Date</dt>
            <dd>{new Date(claim.incidentDate).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt>Assigned To</dt>
            <dd>{assignedUser ? assignedUser.name : '—'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{new Date(claim.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Last Updated</dt>
            <dd>{new Date(claim.updatedAt).toLocaleString()}</dd>
          </div>
        </dl>
      </section>

      <section className="claim-detail-panel" aria-label="Status update">
        <h2>Update Status</h2>
        {canEditClaim ? (
          <div className="claim-status-controls">
            <select
              value={statusValue}
              onChange={(event) => setStatusValue(event.target.value as ClaimStatus)}
              disabled={statusLoading}
            >
              {CLAIM_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleStatusUpdate}
              disabled={statusLoading || statusValue === claim.status}
            >
              {statusLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
        ) : (
          <p>Only admins or the assigned adjuster can update this claim.</p>
        )}
      </section>

      <section className="claim-detail-panel" aria-label="Description">
        <h2>Description</h2>
        <p className="claim-description-text">{claim.description}</p>
      </section>

      <section className="claim-detail-panel" aria-label="Notes">
        <h2>Notes</h2>
        <ul className="claim-notes-list">
          {claim.notes.length === 0 ? (
            <li>No notes yet.</li>
          ) : (
            claim.notes.map((note, index) => {
              const authorName = typeof note.author === 'string' ? 'Unknown' : note.author.name
              return (
                <li key={`${note.createdAt}-${index}`} className="claim-note-item">
                  <p>{note.text}</p>
                  <p className="claim-note-meta">
                    {authorName} • {new Date(note.createdAt).toLocaleString()}
                  </p>
                </li>
              )
            })
          )}
        </ul>

        <form className="claim-note-form" onSubmit={handleAddNote}>
          <label htmlFor="newNote">
            Add Note
            <input
              id="newNote"
              type="text"
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              required
              disabled={noteLoading}
            />
          </label>
          <button type="submit" disabled={noteLoading || !noteText.trim()}>
            {noteLoading ? 'Adding...' : 'Add Note'}
          </button>
        </form>
      </section>

      {canDeleteClaim ? (
        <section className="claim-detail-panel" aria-label="Delete claim">
          <h2>Delete Claim</h2>
          <button type="button" className="claim-delete-button" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete Claim'}
          </button>
        </section>
      ) : null}
    </main>
  )
}

export default ClaimDetailPage
