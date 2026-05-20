import { createContext, useContext, useState, useCallback, useEffect } from "react"

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

const TOKEN_KEY = "flashmind_token"
const PERSIST_KEY = "flashmind_persist"
const API_BASE = "/api/auth"

function saveToken(token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token)
  }
  sessionStorage.setItem(TOKEN_KEY, token)
  if (remember) {
    localStorage.setItem(PERSIST_KEY, "1")
  } else {
    localStorage.removeItem(PERSIST_KEY)
  }
}

function loadToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PERSIST_KEY)
}

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = loadToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  return res.json()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = loadToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    apiCall<{ success: boolean; user?: AuthUser; error?: string }>("/me")
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
        "/login",
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
        "/register",
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
      }>("/send-verification", {
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

  const logout = useCallback(() => {
    const token = loadToken()
    if (token) {
      navigator.sendBeacon(`${API_BASE}/logout`, JSON.stringify({}))
    }
    setUser(null)
    clearToken()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      const data = await apiCall<{ success: boolean; error?: string }>(
        "/reset-password",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        }
      )
      if (data.success) return { success: true }
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