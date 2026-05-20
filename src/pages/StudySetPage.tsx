import { useParams, useNavigate, Link } from "react-router-dom"
import {
  ArrowLeft,
  BookOpen,
  RotateCcw,
  Gamepad2,
  Edit3,
  Trash2,
  ChevronRight,
  Clock,
  User,
} from "lucide-react"
import { useStore } from "../store/useStore"

export default function StudySetPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { studySets, deleteStudySet } = useStore()
  const studySet = studySets.find((s) => s.id === id)

  if (!studySet) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <BookOpen className="w-16 h-16 text-surface-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-surface-600 dark:text-surface-400 mb-2">学习集未找到</h2>
        <p className="text-surface-400 dark:text-surface-500 mb-4">该学习集可能已被删除</p>
        <button onClick={() => navigate("/")} className="btn-primary">
          返回首页
        </button>
      </div>
    )
  }

  const handleDelete = () => {
    if (window.confirm(`确定要删除「${studySet.title}」吗？`)) {
      deleteStudySet(studySet.id)
      navigate("/")
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </button>

        {/* Header */}
        <div className="card p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-white mb-3"
                style={{ backgroundColor: studySet.color }}
              >
                {studySet.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 font-display">
                {studySet.title}
              </h1>
              <p className="text-surface-500 dark:text-surface-400 mt-2">{studySet.description}</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-surface-400 dark:text-surface-500">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {studySet.author}
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {studySet.cardCount} 张卡片
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {studySet.createdAt}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="btn-ghost p-2 text-red-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t border-surface-100 dark:border-surface-700">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to={`/set/${studySet.id}/study`}
                className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-brand-500/20"
              >
                <RotateCcw className="w-5 h-5" />
                闪卡学习
              </Link>
              <Link
                to={`/set/${studySet.id}/match`}
                className="flex items-center justify-center gap-2 bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 font-medium px-6 py-3 rounded-xl border border-surface-200 dark:border-surface-600 transition-all duration-200"
              >
                <Gamepad2 className="w-5 h-5" />
                匹配游戏
              </Link>
              <Link
                to={`/set/${studySet.id}/spell`}
                className="flex items-center justify-center gap-2 bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 font-medium px-6 py-3 rounded-xl border border-surface-200 dark:border-surface-600 transition-all duration-200"
              >
                <Edit3 className="w-5 h-5" />
                拼写测试
              </Link>
              <Link
                to={`/set/${studySet.id}/edit`}
                className="flex items-center justify-center gap-2 bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 font-medium px-6 py-3 rounded-xl border border-surface-200 dark:border-surface-600 transition-all duration-200"
              >
                <Edit3 className="w-5 h-5" />
                编辑词汇
              </Link>
            </div>
          </div>
        </div>

        {/* Cards List */}
        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200 mb-4">卡片列表</h2>
          <div className="space-y-3">
            {studySet.cards.map((card, index) => (
              <div
                key={card.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-900 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors group"
              >
                <span className="text-sm font-medium text-surface-400 dark:text-surface-500 w-8 shrink-0 pt-0.5">
                  #{index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-surface-800 dark:text-surface-200 text-sm sm:text-base">{card.term}</p>
                  <p className="text-surface-500 dark:text-surface-400 text-sm mt-0.5">{card.definition}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-surface-400 transition-colors shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
