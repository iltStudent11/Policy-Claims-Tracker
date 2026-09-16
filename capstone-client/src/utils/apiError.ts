import { AxiosError } from 'axios'

export interface ApiErrorResponse {
  message?: string
  errors?: Array<{
    field?: string
    message?: string
  }> | Record<string, string>
}

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const requestError = error as AxiosError<ApiErrorResponse>
  const payload = requestError.response?.data

  if (!payload) {
    return fallback
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors[0]?.message ?? payload.message ?? fallback
  }

  if (payload.errors && typeof payload.errors === 'object') {
    const firstError = Object.values(payload.errors)[0]
    if (firstError) {
      return firstError
    }
  }

  return payload.message ?? fallback
}
