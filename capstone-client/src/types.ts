export type UserRole = 'admin' | 'adjuster'

export type PolicyType = 'auto' | 'home' | 'life'
export type PolicyStatus = 'active' | 'expired' | 'cancelled'

export type ClaimStatus = 'submitted' | 'under-review' | 'approved' | 'denied' | 'closed'

export interface User {
  _id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
  __v?: number
}

export interface Policy {
  _id: string
  policyNumber: string
  holderName: string
  type: PolicyType
  premium: number
  status: PolicyStatus
  effectiveDate: string
  expirationDate: string
  owner: string | User
  createdAt: string
  __v?: number
}

export interface ClaimNote {
  author: string | User
  text: string
  createdAt: string
}

export interface Claim {
  _id: string
  claimNumber: string
  policy: string | Policy
  description: string
  incidentDate: string
  amount: number
  status: ClaimStatus
  assignedTo?: string | User
  notes: ClaimNote[]
  createdAt: string
  updatedAt: string
  __v?: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

export interface AuthResponse {
  token: string
  user: User
}

export interface CurrentUserResponse {
  user: User | null
}

export interface HealthResponse {
  status: 'ok'
}

export interface ClaimsStats {
  totalClaims: number
  totalClaimAmount: number
  countByStatus: Partial<Record<ClaimStatus, number>>
}

export interface ClaimsStatsResponse {
  data: ClaimsStats
}

export interface DashboardStats {
  totalClaims: number
  claimsByStatus: Partial<Record<ClaimStatus, number>>
  totalPolicies: number
  policiesByType: Partial<Record<PolicyType, number>>
  totalUsers: number
  recentClaims: Claim[]
  totalClaimAmount: number
}

export interface DashboardResponse {
  data: DashboardStats
}

export interface MessageResponse {
  message: string
}

export interface FieldValidationErrors {
  [field: string]: string
}

export interface ValidationErrorResponse {
  message: string
  errors: FieldValidationErrors
}
