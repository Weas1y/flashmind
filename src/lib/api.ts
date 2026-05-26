const TOKEN_KEY = "flashmind_token"
const PERSIST_KEY = "flashmind_persist"

export function saveToken(token: string, remember: boolean) {
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

export function loadToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PERSIST_KEY)
}

export async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = loadToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  const res = await fetch(path.startsWith("/api") ? path : `/api${path}`, { ...options, headers })
  return res.json()
}
