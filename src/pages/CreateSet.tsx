import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Trash2, Save, Sparkles, Upload, X, FileText, LogIn } from "lucide-react"
import { useStore } from "../store/useStore"
import { useAuth } from "../contexts/AuthContext"

interface CardForm {
  term: string
  definition: string
}

export default function CreateSet() {
  const navigate = useNavigate()
  const { addStudySet, categories } = useStore()
  const { user, isAuthenticated } = useAuth()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("考试英语")
  const [color, setColor] = useState("#4A6BFF")
  const [cards, setCards] = useState<CardForm[]>([
    { term: "", definition: "" },
    { term: "", definition: "" },
  ])
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState("")

  const colors = [
    "#4A6BFF", "#FF8C42", "#10B981", "#EC4899",
    "#8B5CF6", "#F59E0B", "#3B82F6", "#14B8A6",
    "#EF4444", "#6B7280",
  ]

  const storeCategories = categories.filter((c) => c !== "全部")

  const handleImport = () => {
    const lines = importText.trim().split("\n").filter(Boolean)
    const imported: CardForm[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      let term = ""
      let definition = ""

      if (trimmed.includes("\t")) {
        const parts = trimmed.split("\t")
        term = parts[0].trim()
        definition = parts.slice(1).join(" ").trim()
      } else {
        const commaIndex = trimmed.indexOf(",")
        if (commaIndex > 0) {
          term = trimmed.slice(0, commaIndex).trim()
          definition = trimmed.slice(commaIndex + 1).trim()
        } else {
          term = trimmed
          definition = ""
        }
      }

      if (term) {
        imported.push({ term, definition })
      }
    }

    if (imported.length > 0) {
      setCards(imported)
      setShowImport(false)
      setImportText("")
    }
  }

  const addCard = () => {
    setCards((prev) => [...prev, { term: "", definition: "" }])
  }

  const removeCard = (index: number) => {
    if (cards.length <= 1) return
    setCards((prev) => prev.filter((_, i) => i !== index))
  }

  const updateCard = (index: number, field: keyof CardForm, value: string) => {
    setCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, [field]: value } : card))
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim())
    if (!title.trim() || validCards.length === 0) return

    const authorName = isAuthenticated && user ? user.username : "我"

    const newSet = {
      id: `set-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || `${validCards.length} 张卡片的自定义学习集`,
      color,
      author: authorName,
      userId: isAuthenticated && user ? user.id : "",
      cardCount: validCards.length,
      category,
      createdAt: new Date().toISOString().split("T")[0],
      cards: validCards.map((c, i) => ({
        id: `card-${Date.now()}-${i}`,
        term: c.term.trim(),
        definition: c.definition.trim(),
      })),
    }

    addStudySet(newSet)
    navigate(`/set/${newSet.id}`)
  }

  const canSubmit = title.trim() && cards.some((c) => c.term.trim() && c.definition.trim())

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </button>

        {!isAuthenticated && (
          <div className="card p-12 text-center">
            <LogIn className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-surface-600 dark:text-surface-400 mb-2">请先登录</h3>
            <p className="text-surface-400 dark:text-surface-500 mb-4">登录后即可创建和管理属于你自己的学习集</p>
            <button
              onClick={() => navigate("/login")}
              className="btn-primary"
            >
              前往登录
            </button>
          </div>
        )}

        {isAuthenticated && (
          <>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 font-display">创建学习集</h1>
            <p className="text-sm text-surface-400 dark:text-surface-500">制作属于你自己的单词卡片</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Sticky Save Bar */}
          <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/90 dark:bg-surface-900/90 backdrop-blur-md border-b border-surface-200 dark:border-surface-600 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="flex items-center gap-1.5 text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  返回
                </button>
                <span className="text-sm text-surface-400 dark:text-surface-500 hidden sm:inline">
                  <span className="font-medium text-surface-600 dark:text-surface-400">
                    {cards.filter((c) => c.term.trim() && c.definition.trim()).length}
                  </span>{" "}
                  张有效卡片
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20"
                >
                  <Save className="w-4 h-4" />
                  保存学习集
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
          {/* Basic Info */}
          <div className="card p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">基本信息</h2>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                标题 *
              </label>
              <input
                type="text"
                placeholder="例如：GRE 核心词汇"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                描述
              </label>
              <textarea
                placeholder="简要描述这个学习集的内容..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="input-field resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                分类
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field"
              >
                {storeCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                封面颜色
              </label>
              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      color === c ? "ring-2 ring-offset-2 ring-brand-500 scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
                卡片 ({cards.filter((c) => c.term.trim()).length}/{cards.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowImport(true)}
                  className="text-sm text-accent-500 hover:text-accent-600 font-medium flex items-center gap-1"
                >
                  <Upload className="w-4 h-4" />
                  批量导入
                </button>
                <button
                  type="button"
                  onClick={addCard}
                  className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  添加卡片
                </button>
              </div>
            </div>

            {/* Import Panel */}
            {showImport && (
              <div className="mb-4 p-4 rounded-xl bg-accent-50 dark:bg-accent-900/30 border border-accent-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent-500" />
                    <span className="font-medium text-sm text-surface-800 dark:text-surface-200">批量导入</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImport(false)
                      setImportText("")
                    }}
                    className="p-1 hover:bg-accent-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-surface-400 dark:text-surface-500" />
                  </button>
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
                  每行一组，用 <code className="px-1 py-0.5 bg-accent-100 rounded text-accent-700 dark:text-accent-300 text-xs">Tab</code> 或 <code className="px-1 py-0.5 bg-accent-100 rounded text-accent-700 dark:text-accent-300 text-xs">逗号</code> 分隔术语和定义
                </p>
                <textarea
                  placeholder={"单词, 释义\n例:\nAberration, 偏差，失常\nBenevolent, 仁慈的，善意的"}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-accent-200 bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 placeholder-surface-400 dark:placeholder-surface-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent-300 transition-all resize-none"
                />
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImport(false)
                      setImportText("")
                    }}
                    className="px-3 py-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!importText.trim()}
                    className="px-4 py-1.5 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    导入 {importText.trim() ? `${importText.trim().split("\n").filter(Boolean).length} 张` : ""}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {cards.map((card, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-900 group"
                >
                  <span className="text-sm font-medium text-surface-400 dark:text-surface-500 pt-3 w-6 shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="术语"
                      value={card.term}
                      onChange={(e) => updateCard(index, "term", e.target.value)}
                      className="input-field text-sm"
                    />
                    <input
                      type="text"
                      placeholder="定义"
                      value={card.definition}
                      onChange={(e) => updateCard(index, "definition", e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCard(index)}
                    className="p-2 text-surface-300 dark:text-surface-600 hover:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addCard}
              className="mt-3 w-full py-3 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-600 text-surface-400 dark:text-surface-500 hover:border-brand-300 hover:text-brand-500 transition-all text-sm font-medium flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              添加卡片
            </button>
          </div>
          </div>
        </form>
          </>)}
      </div>
    </div>
  )
}
