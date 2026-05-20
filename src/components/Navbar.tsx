import { Link, useNavigate } from "react-router-dom"
import { Search, Plus, Sparkles, User, Moon, Sun, LogOut, LogIn } from "lucide-react"
import { useStore } from "../store/useStore"
import { useTheme } from "../hooks/useTheme"
import { useAuth } from "../contexts/AuthContext"
import { useState, useRef, useEffect } from "react"

export default function Navbar() {
  const { searchQuery, setSearchQuery } = useStore()
  const { isDark, toggle } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-surface-900/80 backdrop-blur-lg border-b border-surface-100 dark:border-surface-700 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-500 to-accent-500 font-display">
              FlashMind
            </span>
          </Link>

          <div className="hidden sm:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="搜索学习集、单词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-700 dark:text-surface-200 placeholder-surface-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-500 focus:border-brand-300 dark:focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="btn-ghost p-2 rounded-lg"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/create" className="btn-primary hidden sm:flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" />
              创建
            </Link>

            {isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 dark:from-brand-300 dark:to-accent-300 text-white flex items-center justify-center ring-2 ring-brand-200 dark:ring-brand-500 hover:ring-brand-400 dark:hover:ring-brand-300 transition-all"
                >
                  <span className="text-xs font-bold">{user.username.charAt(0).toUpperCase()}</span>
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-10 w-48 card p-2 shadow-float animate-fade-in z-50">
                    <div className="px-3 py-2 border-b border-surface-100 dark:border-surface-700 mb-1">
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{user.username}</p>
                      <p className="text-xs text-surface-400 dark:text-surface-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { navigate("/profile"); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" />
                      个人资料
                    </button>
                    <button
                      onClick={() => { logout(); setShowMenu(false); navigate("/") }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">登录</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="sm:hidden px-4 pb-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="搜索学习集..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-700 dark:text-surface-200 placeholder-surface-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-500 transition-all"
          />
        </div>
      </div>
    </nav>
  )
}