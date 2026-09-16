import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import api from '../api'
import type { AuthResponse, User, UserRole } from '../types'
import { getApiErrorMessage } from '../utils/apiError'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_TOKEN_KEY = 'token'
const AUTH_USER_KEY = 'user'

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
    const storedUser = localStorage.getItem(AUTH_USER_KEY)

    if (storedToken) {
      setToken(storedToken)
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as User)
      } catch {
        localStorage.removeItem(AUTH_USER_KEY)
      }
    }

    setLoading(false)
  }, [])

  const persistAuth = useCallback((auth: AuthResponse) => {
    setToken(auth.token)
    setUser(auth.user)
    localStorage.setItem(AUTH_TOKEN_KEY, auth.token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(auth.user))
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        const response = await api.post<AuthResponse>('/auth/login', { email, password })
        persistAuth(response.data)
      } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Unable to log in. Please try again.'))
      } finally {
        setLoading(false)
      }
    },
    [persistAuth],
  )

  const register = useCallback(
    async (name: string, email: string, password: string, role: UserRole) => {
      setLoading(true)
      try {
        const response = await api.post<AuthResponse>('/auth/register', {
          name,
          email,
          password,
          role,
        })
        persistAuth(response.data)
      } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Unable to register. Please try again.'))
      } finally {
        setLoading(false)
      }
    },
    [persistAuth],
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
    }),
    [user, token, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
