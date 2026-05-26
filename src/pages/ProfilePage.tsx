import { Link, useNavigate } from "react-router-dom"
import {
  BookOpen,
  Trophy,
  Clock,
  BarChart3,
  ChevronRight,
  LogIn,
} from "lucide-react"
import { useStore } from "../store/useStore"
import { useAuth } from "../contexts/AuthContext"

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { studySets } = useStore()

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="card p-12 text-center">
            <LogIn className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-surface-600 dark:text-surface-400 mb-2">请先登录</h3>
            <p className="text-surface-400 dark:text-surface-500 mb-4">登录后查看你的个人学习统计</p>
            <button
              onClick={() => navigate("/login")}
              className="btn-primary"
            >
              前往登录
            </button>
          </div>
        </div>
      </div>
    )
  }

  const mySets = studySets.filter((s) => s.userId === user.id)
  const totalCards = mySets.reduce((acc, s) => acc + s.cardCount, 0)

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="card p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold font-display shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-100 font-display">
                {user.username}
              </h1>
              <p className="text-surface-400 dark:text-surface-500 text-sm mt-1">
                已创建 {mySets.length} 个学习集，共 {totalCards} 张卡片
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-surface-100 dark:border-surface-700">
            {[
              { label: "学习集", value: mySets.length, icon: BookOpen },
              { label: "已掌握", value: "128", icon: Trophy },
              { label: "学习天数", value: "7", icon: BarChart3 },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-100">{stat.value}</p>
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">我的学习集</h2>
            <Link to="/create" className="text-sm text-brand-500 dark:text-brand-400 hover:text-brand-600 font-medium">
              创建新的
            </Link>
          </div>

          {mySets.length > 0 ? (
            <div className="space-y-2">
              {mySets.map((set) => (
                <Link
                  key={set.id}
                  to={`/set/${set.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: set.color }}
                  >
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-surface-800 dark:text-surface-200 text-sm sm:text-base">
                      {set.title}
                    </h3>
                    <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                      {set.cardCount} 张卡片 · {set.createdAt}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-surface-300 dark:text-surface-600 group-hover:text-surface-400 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
              <p className="text-surface-500 dark:text-surface-400 mb-3">还没有创建学习集</p>
              <Link to="/create" className="btn-primary inline-flex items-center gap-1.5">
                创建第一个
              </Link>
            </div>
          )}
        </div>

        <div className="card p-6 sm:p-8 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-surface-400 dark:text-surface-500" />
            <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">最近学习</h2>
          </div>
          <div className="space-y-3">
            {mySets.slice(0, 4).map((set) => (
              <Link
                key={set.id}
                to={`/set/${set.id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: set.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-300">{set.title}</p>
                    <p className="text-xs text-surface-400 dark:text-surface-500">最近学习 · {set.category}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-surface-300 dark:text-surface-600" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}