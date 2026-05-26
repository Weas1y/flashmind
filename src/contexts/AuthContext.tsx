import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { ReactNode } from "react"
import { apiCall, saveToken, loadToken, clearToken } from "../lib/api"

export interface AuthUser {
  username: string
  email: string
  id: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string, remember: boolean) => Promise<{ success: boolean; error?: string }>
  register: (username: string, email: string, password: string, code: string) => Promise<{ success: boolean; error?: string }>
  sendVerification: (email: string) => Promise<{ success: boolean; error?: string; message?: string; devMode?: boolean; retryAfter?: number }>
  logout: () => void
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | null>(null)

const API_BASE = "/api/auth"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = loadToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    apiCall<{ success: boolean; user?: AuthUser; error?: string }>(`${API_BASE}/me`)
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user)
        } else {
          clearToken()
        }
      })
      .catch(() => {
        clearToken()
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string, remember: boolean) => {
    try {
      const data = await apiCall<{ success: boolean; user?: AuthUser; token?: string; error?: string }>(
        `${API_BASE}/login`,
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
        }
      )
      if (data.success && data.user && data.token) {
        saveToken(data.token, remember)
        setUser(data.user)
        return { success: true }
      }
      return { success: false, error: data.error || "登录失败，请重试" }
    } catch {
      return { success: false, error: "网络错误，请检查网络连接" }
    }
  }, [])

  const register = useCallback(async (username: string, email: string, password: string, code: string) => {
    try {
      const data = await apiCall<{ success: boolean; user?: AuthUser; token?: string; error?: string }>(
        `${API_BASE}/register`,
        {
          method: "POST",
          body: JSON.stringify({ username, email, password, code }),
        }
      )
      if (data.success && data.user && data.token) {
        saveToken(data.token, true)
        setUser(data.user)
        return { success: true }
      }
      return { success: false, error: data.error || "注册失败，请重试" }
    } catch {
      return { success: false, error: "网络错误，请检查网络连接" }
    }
  }, [])

  const sendVerification = useCallback(async (email: string) => {
    try {
      const data = await apiCall<{
        success: boolean
        error?: string
        message?: string
        devMode?: boolean
        retryAfter?: number
      }>(`${API_BASE}/send-verification`, {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      if (data.success) {
        return { success: true, message: data.message, devMode: data.devMode }
      }
      return { success: false, error: data.error, retryAfter: data.retryAfter }
    } catch {
      return { success: false, error: "网络错误，请检查网络连接" }
    }
  }, [])

  const logout = useCallback(async () => {
    const token = loadToken()
    if (token) {
      try {
        await apiCall(`${API_BASE}/logout`, {
          method: "POST",
        })
      } catch {
        // ignore
      }
    }
    setUser(null)
    clearToken()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      const data = await apiCall<{ success: boolean; error?: string; message?: string }>(
        `${API_BASE}/reset-password`,
        {
          method: "POST",
          body: JSON.stringify({ email }),
        }
      )
      if (data.success) return { success: true, message: data.message }
      return { success: false, error: data.error || "发送失败" }
    } catch {
      return { success: false, error: "网络错误，请检查网络连接" }
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        sendVerification,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
