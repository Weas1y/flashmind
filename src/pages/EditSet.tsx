import { useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Check,
  Upload,
  FileText,
  UploadCloud,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { useStore } from "../store/useStore"

function generateCardId() {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function parseImportText(text: string): { term: string; definition: string }[] {
  const lines = text.trim().split("\n").filter(Boolean)
  const parsed: { term: string; definition: string }[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    let term = ""
    let definition = ""

    if (trimmed.includes("\t")) {
      const parts = trimmed.split("\t")
      term = parts[0].trim()
      definition = parts.slice(1).join(" ").trim()
    } else if (trimmed.includes(",")) {
      const commaIndex = trimmed.indexOf(",")
      term = trimmed.slice(0, commaIndex).trim()
      definition = trimmed.slice(commaIndex + 1).trim()
    } else {
      term = trimmed
      definition = ""
    }

    if (term) {
      parsed.push({ term, definition })
    }
  }

  return parsed
}

export default function EditSet() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { studySets, updateStudySet } = useStore()
  const studySet = studySets.find((s) => s.id === id)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cards, setCards] = useState(() =>
    studySet ? studySet.cards.map((c) => ({ ...c })) : []
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTerm, setEditTerm] = useState("")
  const [editDef, setEditDef] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTerm, setNewTerm] = useState("")
  const [newDef, setNewDef] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState("")
  const [importMode, setImportMode] = useState<"text" | "file">("text")
  const [showConfirmImport, setShowConfirmImport] = useState(false)
  const [importResult, setImportResult] = useState<{ total: number; newCount: number; dupCount: number; dupTerms: string[] } | null>(null)

  if (!studySet) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-semibold text-surface-600 dark:text-surface-400 mb-2">学习集未找到</h2>
        <p className="text-surface-400 dark:text-surface-500 mb-4">该学习集可能已被删除</p>
        <button onClick={() => navigate("/")} className="btn-primary">返回首页</button>
      </div>
    )
  }

  const syncStore = (updatedCards: typeof cards) => {
    setCards(updatedCards)
    updateStudySet(studySet.id, {
      cards: updatedCards,
      cardCount: updatedCards.length,
    })
  }

  const handleStartEdit = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return
    setEditingId(cardId)
    setEditTerm(card.term)
    setEditDef(card.definition)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTerm("")
    setEditDef("")
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    if (!editTerm.trim()) return
    const updated = cards.map((c) =>
      c.id === editingId ? { ...c, term: editTerm.trim(), definition: editDef.trim() } : c
    )
    syncStore(updated)
    setEditingId(null)
    setEditTerm("")
    setEditDef("")
  }

  const handleDelete = (cardId: string) => {
    const updated = cards.filter((c) => c.id !== cardId)
    syncStore(updated)
    setDeleteTarget(null)
  }

  const handleAdd = () => {
    if (!newTerm.trim()) return
    const newCard = {
      id: generateCardId(),
      term: newTerm.trim(),
      definition: newDef.trim(),
    }
    const updated = [...cards, newCard]
    syncStore(updated)
    setNewTerm("")
    setNewDef("")
    setShowAddForm(false)
  }

  const parsedItems = parseImportText(importText)

  const existingTermSet = new Set(cards.map((c) => c.term.toLowerCase()))
  const dupTerms: string[] = []
  const newItems = parsedItems.filter((item) => {
    if (existingTermSet.has(item.term.toLowerCase())) {
      dupTerms.push(item.term)
      return false
    }
    return true
  })
  const dupCount = dupTerms.length
  const newCount = newItems.length
  const totalCount = parsedItems.length

  const handleOpenConfirm = () => {
    if (parsedItems.length === 0) return
    setShowConfirmImport(true)
    setImportResult(null)
  }

  const handleConfirmImport = () => {
    if (newItems.length === 0) {
      setShowConfirmImport(false)
      return
    }
    const newCards = newItems.map((item) => ({
      id: generateCardId(),
      term: item.term,
      definition: item.definition,
    }))
    syncStore([...cards, ...newCards])
    setImportResult({ total: totalCount, newCount, dupCount, dupTerms })
  }

  const handleCloseResult = () => {
    setShowConfirmImport(false)
    setShowImport(false)
    setImportText("")
    setImportMode("text")
    setImportResult(null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      setImportText(content)
      setImportMode("file")
      setShowImport(true)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const hasCards = cards.length > 0

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <button
          onClick={() => navigate(`/set/${studySet.id}`)}
          className="flex items-center gap-1.5 text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回学习集
        </button>

        <div className="card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 font-display">
                编辑词汇
              </h1>
              <p className="text-surface-500 dark:text-surface-400 mt-1">
                {studySet.title} · {cards.length} 张卡片
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowImport(true)
                  setImportText("")
                  setImportMode("text")
                }}
                className="flex items-center gap-1.5 bg-accent-50 dark:bg-accent-900/30 hover:bg-accent-100 dark:hover:bg-accent-900/20 text-accent-600 dark:text-accent-400 font-medium px-4 py-2.5 rounded-xl transition-all duration-200 border border-accent-200 dark:border-accent-700"
              >
                <UploadCloud className="w-4 h-4" />
                批量导入
              </button>
              <button
                onClick={() => {
                  setShowAddForm(true)
                  setNewTerm("")
                  setNewDef("")
                }}
                className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.97] shadow-lg shadow-brand-500/20"
              >
                <Plus className="w-4 h-4" />
                添加词汇
              </button>
            </div>
          </div>

          {/* Batch Import Panel */}
          {showImport && (
            <div className="mb-6 p-5 rounded-2xl bg-accent-50/60 dark:bg-accent-900/30 border border-accent-200 dark:border-accent-700 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent-500 dark:text-accent-400" />
                  <span className="font-semibold text-surface-800 dark:text-surface-200">
                    批量导入{importMode === "file" ? " · 文件" : ""}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowImport(false)
                    setImportText("")
                    setImportMode("text")
                  }}
                  className="p-1 rounded-lg hover:bg-accent-100 dark:hover:bg-accent-900/20 transition-colors"
                >
                  <X className="w-4 h-4 text-surface-400 dark:text-surface-500" />
                </button>
              </div>

              <p className="text-xs text-surface-500 mb-4">
                每行一组，用 <code className="px-1 py-0.5 bg-accent-100 rounded text-accent-700 dark:text-accent-300 text-xs">Tab</code> 或 <code className="px-1 py-0.5 bg-accent-100 rounded text-accent-700 dark:text-accent-300 text-xs">逗号</code> 分隔术语和释义
              </p>

              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setImportMode("text")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    importMode === "text"
                      ? "bg-accent-200 text-accent-700 dark:text-accent-300"
                      : "text-surface-500 dark:text-surface-400 hover:bg-accent-100 dark:hover:bg-accent-900/20"
                  }`}
                >
                  粘贴文本
                </button>
                <button
                  onClick={() => {
                    setImportMode("file")
                    fileInputRef.current?.click()
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    importMode === "file"
                      ? "bg-accent-200 text-accent-700 dark:text-accent-300"
                      : "text-surface-500 dark:text-surface-400 hover:bg-accent-100 dark:hover:bg-accent-900/20"
                  }`}
                >
                  上传文件
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <textarea
                placeholder="单词, 释义&#10;例:&#10;Aberration, 偏差，失常&#10;Benevolent, 仁慈的，善意的&#10;Ubiquitous	无处不在的"
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value)
                  setImportMode("text")
                }}
                rows={7}
                className="w-full px-4 py-3 rounded-xl border border-accent-200 dark:border-accent-700 bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 placeholder-surface-400 dark:placeholder-surface-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent-300 transition-all resize-none"
              />

              {parsedItems.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-accent-600 dark:text-accent-400">
                  <Check className="w-4 h-4" />
                  解析到 {parsedItems.length} 个词汇
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowImport(false)
                    setImportText("")
                    setImportMode("text")
                  }}
                  className="px-3 py-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleOpenConfirm}
                  disabled={parsedItems.length === 0}
                  className="px-4 py-1.5 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  下一步 {parsedItems.length > 0 ? `(${parsedItems.length} 张)` : ""}
                </button>
              </div>
            </div>
          )}

          {/* Add single card form */}
          {showAddForm && (
            <div className="mb-6 p-5 bg-brand-50/50 dark:bg-brand-900/30 rounded-2xl border border-brand-100 dark:border-brand-700 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-surface-800 dark:text-surface-200">新词汇</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-1 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <X className="w-4 h-4 text-surface-400 dark:text-surface-500" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">词汇</label>
                  <input
                    type="text"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="输入词汇"
                    className="input-field"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTerm.trim()) handleAdd()
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">释义</label>
                  <input
                    type="text"
                    value={newDef}
                    onChange={(e) => setNewDef(e.target.value)}
                    placeholder="输入释义"
                    className="input-field"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTerm.trim()) handleAdd()
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleAdd} className="btn-accent flex items-center gap-1.5">
                  <Save className="w-4 h-4" />
                  保存
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="btn-ghost"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Cards List */}
          {!hasCards && !showAddForm && !showImport ? (
            <div className="text-center py-16">
              <Edit3 className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
              <p className="text-surface-400 dark:text-surface-500 mb-4">暂无词汇</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                添加第一个词汇
              </button>
            </div>
          ) : (
            <div className="relative">
              <div
                className="max-h-[440px] overflow-y-auto scrollbar-hide pr-1 -mr-1 space-y-2"
                style={{ scrollbarGutter: "stable" }}
              >
                {cards.map((card, index) => (
                  <div key={card.id}>
                    {editingId === card.id ? (
                      <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                              词汇
                            </label>
                            <input
                              type="text"
                              value={editTerm}
                              onChange={(e) => setEditTerm(e.target.value)}
                              className="input-field"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit()
                                if (e.key === "Escape") handleCancelEdit()
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                              释义
                            </label>
                            <input
                              type="text"
                              value={editDef}
                              onChange={(e) => setEditDef(e.target.value)}
                              className="input-field"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit()
                                if (e.key === "Escape") handleCancelEdit()
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="btn-accent flex items-center gap-1.5 text-sm px-3 py-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            确认
                          </button>
                          <button onClick={handleCancelEdit} className="btn-ghost text-sm px-3 py-1.5">
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors group">
                        <span className="text-sm font-medium text-surface-400 dark:text-surface-500 w-8 shrink-0 pt-1">
                          #{index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-surface-800 dark:text-surface-200 text-sm sm:text-base">
                            {card.term}
                          </p>
                          <p className="text-surface-500 dark:text-surface-400 text-sm mt-0.5">{card.definition}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => handleStartEdit(card.id)}
                            className="p-1.5 rounded-lg hover:bg-white text-surface-400 dark:text-surface-500 hover:text-brand-500 transition-colors"
                            title="编辑"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(card.id)}
                            className="p-1.5 rounded-lg hover:bg-white text-surface-400 dark:text-surface-500 hover:text-red-500 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Scroll fade hint */}
              {hasCards && cards.length > 8 && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent rounded-b-xl" />
              )}
            </div>
          )}

          {/* Bottom action */}
          {hasCards && (
            <button
              onClick={() => {
                setShowAddForm(true)
                setNewTerm("")
                setNewDef("")
              }}
              className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-600 text-surface-400 dark:text-surface-500 hover:border-brand-300 hover:text-brand-500 transition-all text-sm font-medium flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              添加词汇
            </button>
          )}
        </div>
      </div>

      {/* Import confirmation modal */}
      {showConfirmImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="card p-6 mx-4 w-full max-w-md max-h-[85vh] overflow-y-auto">
            {importResult ? (
              /* --- Result View --- */
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">导入成功</h2>
                <p className="text-surface-500 dark:text-surface-400 mb-5">
                  已成功导入 {importResult.newCount} 个词汇
                  {importResult.dupCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">，跳过 {importResult.dupCount} 个重复词</span>
                  )}
                </p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                    新增 {importResult.newCount}
                  </div>
                  {importResult.dupCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg">
                      <AlertTriangle className="w-4 h-4" />
                      重复 {importResult.dupCount}
                    </div>
                  )}
                </div>
                {importResult.dupTerms.length > 0 && (
                  <div className="mt-3 mb-5 text-left p-3 bg-surface-50 dark:bg-surface-900 rounded-xl">
                    <p className="text-xs font-medium text-surface-400 dark:text-surface-500 mb-1.5">跳过的重复词汇</p>
                    <div className="flex flex-wrap gap-1.5">
                      {importResult.dupTerms.map((t) => (
                        <span key={t} className="text-xs px-2 py-0.5 bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400 rounded-md border border-surface-200 dark:border-surface-600">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleCloseResult}
                  className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors"
                >
                  完成
                </button>
              </div>
            ) : (
              /* --- Confirmation View --- */
              <>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-accent-500 dark:text-accent-400" />
                  确认批量导入
                </h2>

                <div className="bg-surface-50 dark:bg-surface-900 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-3 text-center mb-4">
                    <div className="bg-white dark:bg-surface-800 rounded-lg p-3 border border-surface-100 dark:border-surface-700">
                      <div className="text-2xl font-bold text-accent-600 dark:text-accent-400">{totalCount}</div>
                      <div className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">解析总数</div>
                    </div>
                    <div className="bg-white dark:bg-surface-800 rounded-lg p-3 border border-surface-100 dark:border-surface-700">
                      <div className="text-2xl font-bold text-green-600">{newCount}</div>
                      <div className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">将要新增</div>
                    </div>
                  </div>

                  {dupCount > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                          检测到 {dupCount} 个重复词汇，将自动跳过
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          {dupTerms.slice(0, 6).join("、")}
                          {dupTerms.length > 6 && ` 等 ${dupTerms.length} 个`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {newCount > 0 && (
                  <div className="mb-4 p-3 bg-surface-50 dark:bg-surface-900 rounded-xl max-h-32 overflow-y-auto scrollbar-hide">
                    <p className="text-xs font-medium text-surface-400 dark:text-surface-500 mb-1.5">即将添加的词汇</p>
                    <div className="flex flex-wrap gap-1">
                      {newItems.slice(0, 20).map((item) => (
                        <span key={item.term} className="text-xs px-2 py-0.5 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded-md border border-surface-200 dark:border-surface-600">
                          {item.term}
                        </span>
                      ))}
                      {newItems.length > 20 && (
                        <span className="text-xs text-surface-400 dark:text-surface-500">等 {newItems.length} 个</span>
                      )}
                    </div>
                  </div>
                )}

                {newCount === 0 ? (
                  <>
                    <p className="text-sm text-surface-500 dark:text-surface-400 text-center mb-4">
                      所有词汇均与现有卡片重复，无需导入
                    </p>
                    <button
                      onClick={() => setShowConfirmImport(false)}
                      className="w-full py-2.5 border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 font-medium rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                    >
                      返回
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowConfirmImport(false)}
                      className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600 text-surface-500 dark:text-surface-400 font-medium hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      className="flex-1 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      确认导入 {newCount} 个
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="card p-6 mx-4 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">确认删除</h3>
            <p className="text-surface-500 dark:text-surface-400 text-sm mb-4">
              确定要删除词汇「{cards.find((c) => c.id === deleteTarget)?.term}」吗？此操作不可撤销。
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 font-medium hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}