import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  BookOpen,
  Brain,
  Zap,
  Trophy,
  ArrowRight,
  Sparkles,
  Plus,
  Layers,
  LogIn,
} from "lucide-react"
import { useStore } from "../store/useStore"
import { useAuth } from "../contexts/AuthContext"
import StudySetCard from "../components/StudySetCard"
import {
  getDailyStudyMinutes,
  getConsecutiveDays,
  getMasteredCardCount,
} from "../lib/utils"

interface ToastMessage {
  id: string
  setId: string
  title: string
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { studySets, getFilteredSets, softDeleteStudySet, undoDeleteStudySet } = useStore()
  const filteredSets = getFilteredSets()
  const featuredSet = studySets[0]

  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const [todayMinutes, setTodayMinutes] = useState(getDailyStudyMinutes)
  const [consecutiveDays, setConsecutiveDays] = useState(getConsecutiveDays)
  const [masteredCount, setMasteredCount] = useState(getMasteredCardCount)

  useEffect(() => {
    const timer = setInterval(() => {
      setTodayMinutes(getDailyStudyMinutes())
      setConsecutiveDays(getConsecutiveDays())
      setMasteredCount(getMasteredCardCount())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const stats = [
    { label: "学习集", value: studySets.length, icon: Layers, color: "text-brand-500", bg: "bg-brand-50 dark:bg-brand-900/30" },
    { label: "今日学习", value: `${todayMinutes} 分钟`, icon: Brain, color: "text-accent-500", bg: "bg-accent-50 dark:bg-accent-900/30" },
    { label: "已掌握", value: `${masteredCount} 张`, icon: Trophy, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
    { label: "连续学习", value: `${consecutiveDays} 天`, icon: Zap, color: "text-purple-500", bg: "bg-purple-50" },
  ]

  const handleConfirmDelete = (id: string) => {
    const target = studySets.find((s) => s.id === id)
    if (!target) return
    softDeleteStudySet(id)
    const toastId = `toast-${Date.now()}`
    setToasts((prev) => [...prev, { id: toastId, setId: id, title: target.title }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId))
    }, 10000)
  }

  const handleUndoDelete = (toastId: string, setId: string) => {
    undoDeleteStudySet(setId)
    setToasts((prev) => prev.filter((t) => t.id !== toastId))
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="relative mb-8 sm:mb-12">
            <div className="absolute -top-6 -left-6 w-40 h-40 bg-brand-500/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 -right-8 w-60 h-60 bg-accent-500/5 rounded-full blur-3xl" />
            <div className="relative text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/20">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-surface-100 font-display leading-tight mb-3">
                你的专属
                <span className="text-gradient"> 学习空间</span>
              </h1>
              <p className="text-surface-500 dark:text-surface-400 text-base sm:text-lg max-w-xl mx-auto mb-8">
                登录后创建和管理属于你自己的单词卡片，开启高效学习之旅。
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => navigate("/login")}
                  className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/20"
                >
                  <LogIn className="w-4 h-4" />
                  登录 / 注册
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="relative mb-8 sm:mb-12">
          <div className="absolute -top-6 -left-6 w-40 h-40 bg-brand-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -right-8 w-60 h-60 bg-accent-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              <span className="text-sm font-medium text-brand-500">
                欢迎回来，{user?.username || "继续学习吧"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-surface-100 font-display leading-tight">
              今天想学
              <span className="text-gradient"> 什么</span>？
            </h1>
            <p className="mt-3 text-surface-500 dark:text-surface-400 text-base sm:text-lg max-w-xl">
              浏览你的学习集，或创建新的单词卡片，让学习更高效有趣。
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => navigate("/create")}
                className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/20"
              >
                <Plus className="w-4 h-4" />
                创建学习集
              </button>
              {featuredSet && (
                <button
                  onClick={() => navigate(`/set/${featuredSet.id}`)}
                  className="btn-secondary flex items-center gap-2"
                >
                  最近学习
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="card p-4 flex items-center gap-3 animate-float-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-surface-900 dark:text-surface-100">{stat.value}</p>
                <p className="text-xs text-surface-400 dark:text-surface-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {featuredSet && (
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-500" />
                <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">最近学习</h2>
              </div>
              <button
                onClick={() => navigate(`/set/${featuredSet.id}`)}
                className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1"
              >
                查看全部 <svg className="w-4 h-4"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="sm:w-2/3 lg:w-1/2">
              <StudySetCard set={featuredSet} onConfirmDelete={handleConfirmDelete} />
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
              我的学习集
            </h2>
            <span className="text-sm text-surface-400 dark:text-surface-500">{filteredSets.length} 个集合</span>
          </div>

          {filteredSets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSets.map((set, i) => (
                <div key={set.id} style={{ animationDelay: `${i * 0.04}s` }}>
                  <StudySetCard set={set} onConfirmDelete={handleConfirmDelete} />
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <BookOpen className="w-12 h-12 text-surface-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-surface-600 dark:text-surface-400 mb-2">还没有学习集</h3>
              <p className="text-surface-400 dark:text-surface-500 mb-4">创建你的第一个学习集，开始高效记忆</p>
              <button
                onClick={() => navigate("/create")}
                className="btn-primary"
              >
                创建学习集
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 bg-surface-900 text-white rounded-xl shadow-lg animate-float-up"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">已删除 "{toast.title}"</span>
            </div>
            <button
              onClick={() => handleUndoDelete(toast.id, toast.setId)}
              className="flex items-center gap-1 px-3 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <svg className="w-3 h-3"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              撤销
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}