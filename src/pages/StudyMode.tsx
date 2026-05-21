import { useState, useCallback, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Check,
  X,
  Volume2,
  Settings,
  X as CloseIcon,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Star,
  Shuffle,
  Target,
  ListOrdered,
  ArrowUpDown,
  Keyboard,
} from "lucide-react"
import { useStore } from "../store/useStore"
import {
  addStudyMinutes,
  recordStudyDay,
  addMasteredCard,
  removeMasteredCard,
  getMasteredCardIds,
  addUnmasteredCard,
  removeUnmasteredCard,
  getUnmasteredCardIds,
  clearUnmasteredCards,
} from "../lib/utils"
import { seededShuffle, generateSeed } from "../lib/seededRandom"
import ShortcutSettings from "../components/ShortcutSettings"
import { loadShortcuts, type ShortcutMap } from "../lib/shortcuts"

type StudyModeType = "sequential" | "random"
type SortOrder = "import" | "alpha"

interface SessionProgress {
  index: number
  mode: StudyModeType
  seed: number
  sortOrder: SortOrder
  dailyLimit: number
  includeMastered: boolean
}

const SESSION_PROGRESS_PREFIX = "flashcard_study_session_"

function loadSessionProgress(setId: string): SessionProgress | null {
  try {
    const raw = sessionStorage.getItem(SESSION_PROGRESS_PREFIX + setId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSessionProgress(setId: string, progress: SessionProgress): void {
  try {
    sessionStorage.setItem(SESSION_PROGRESS_PREFIX + setId, JSON.stringify(progress))
  } catch { /* quota exceeded */ }
}

function clearSessionProgress(setId: string): void {
  try {
    sessionStorage.removeItem(SESSION_PROGRESS_PREFIX + setId)
  } catch { /* ignore */ }
}

export default function StudyMode() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { studySets } = useStore()
  const studySet = studySets.find((s) => s.id === id)

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!id) return 0
    return loadSessionProgress(id)?.index ?? 0
  })
  const [isFlipped, setIsFlipped] = useState(false)
  const [knownCards, setKnownCards] = useState<Set<string>>(() => new Set(getMasteredCardIds()))
  const [unmasteredCardIds, setUnmasteredCardIds] = useState<Set<string>>(
    () => new Set(getUnmasteredCardIds())
  )
  const [studyMode, setStudyMode] = useState<StudyModeType>(() => {
    if (!id) return "sequential"
    return loadSessionProgress(id)?.mode ?? "sequential"
  })
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    if (!id) return "import"
    return loadSessionProgress(id)?.sortOrder ?? "import"
  })
  const [dailyLimit, setDailyLimit] = useState(() => {
    if (!id) return 0
    return loadSessionProgress(id)?.dailyLimit ?? 0
  })
  const [includeMastered, setIncludeMastered] = useState(() => {
    if (!id) return true
    return loadSessionProgress(id)?.includeMastered ?? true
  })
  const [randomSeed, setRandomSeed] = useState(() => {
    if (!id) return generateSeed()
    return loadSessionProgress(id)?.seed ?? generateSeed()
  })
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShortcutSettings, setShowShortcutSettings] = useState(false)
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(loadShortcuts)
  const [history, setHistory] = useState<{ index: number; wasKnown: boolean }[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationDirection, setAnimationDirection] = useState<"left" | "right">("right")
  const [feedback, setFeedback] = useState<"known" | "unknown" | null>(null)
  const [isSnapping, setIsSnapping] = useState(false)
  const [showFocusPrompt, setShowFocusPrompt] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  const sessionStartRef = useRef(Date.now())
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    sessionStartRef.current = Date.now()
    recordStudyDay()
    return () => {
      const elapsed = Math.round((Date.now() - sessionStartRef.current) / 60000)
      if (elapsed > 0) addStudyMinutes(elapsed)
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
    }
  }, [])

  const cards = studySet?.cards ?? []

  let baseCards = [...cards]

  if (!includeMastered) {
    baseCards = baseCards.filter((c) => !knownCards.has(c.id))
  }

  if (studyMode === "sequential") {
    if (sortOrder === "alpha") {
      baseCards.sort((a, b) => a.term.localeCompare(b.term))
    }
  }

  if (studyMode === "random") {
    baseCards = seededShuffle(baseCards, randomSeed)
  }

  if (dailyLimit > 0) {
    baseCards = baseCards.slice(0, dailyLimit)
  }

  const focusCards = baseCards.filter((c) => unmasteredCardIds.has(c.id))
  const effectiveCards = isFocusMode ? focusCards : baseCards
  const effectiveTotal = effectiveCards.length

  const clampedIndex = Math.min(currentIndex, Math.max(0, effectiveTotal - 1))
  const currentCard = effectiveCards[clampedIndex]
  const progress = effectiveTotal > 0 ? ((clampedIndex + 1) / effectiveTotal) * 100 : 0
  const unknownCount = effectiveCards.length - knownCards.size
  const hasUnmastered = unmasteredCardIds.size > 0

  const sessionProgress: SessionProgress = {
    index: clampedIndex,
    mode: studyMode,
    seed: randomSeed,
    sortOrder,
    dailyLimit,
    includeMastered,
  }

  const snapAndSetFlipped = useCallback((value: boolean) => {
    setIsSnapping(true)
    setIsFlipped(value)
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
    snapTimerRef.current = setTimeout(() => setIsSnapping(false), 50)
  }, [])

  const goPrev = useCallback(() => {
    setAnimationDirection("left")
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex((i) => i - 1)
      setIsAnimating(false)
    }, 300)
  }, [])

  const goNext = useCallback(() => {
    setAnimationDirection("right")
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex((i) => i + 1)
      setIsAnimating(false)
    }, 300)
  }, [])

  const handlePrevious = useCallback(() => {
    if (currentIndex <= 0 || !currentCard || feedback) return
    snapAndSetFlipped(false)
    setHistory((prev) => [...prev, { index: clampedIndex, wasKnown: knownCards.has(currentCard.id) }])
    setKnownCards((prev) => {
      const next = new Set(prev)
      next.delete(currentCard.id)
      return next
    })
    removeMasteredCard(currentCard.id)
    if (!unmasteredCardIds.has(currentCard.id)) {
      setUnmasteredCardIds((prev) => new Set(prev).add(currentCard.id))
      addUnmasteredCard(currentCard.id)
    }
    setFeedback("unknown")
    setTimeout(() => {
      setFeedback(null)
      goPrev()
    }, 500)
  }, [currentIndex, currentCard, clampedIndex, knownCards, unmasteredCardIds, feedback, snapAndSetFlipped, goPrev])

  const handleNext = useCallback(() => {
    if (currentIndex >= effectiveTotal - 1 || !currentCard || feedback) return
    snapAndSetFlipped(false)
    setHistory((prev) => [...prev, { index: clampedIndex, wasKnown: knownCards.has(currentCard.id) }])
    setKnownCards((prev) => new Set(prev).add(currentCard.id))
    addMasteredCard(currentCard.id)
    if (unmasteredCardIds.has(currentCard.id)) {
      setUnmasteredCardIds((prev) => {
        const next = new Set(prev)
        next.delete(currentCard.id)
        return next
      })
      removeUnmasteredCard(currentCard.id)
    }
    setFeedback("known")
    setTimeout(() => {
      setFeedback(null)
      goNext()
    }, 500)
  }, [currentIndex, effectiveTotal, currentCard, clampedIndex, knownCards, unmasteredCardIds, feedback, snapAndSetFlipped, goNext])

  const handleMarkKnown = useCallback(() => {
    if (!currentCard || feedback) return
    snapAndSetFlipped(false)
    setHistory((prev) => [...prev, { index: clampedIndex, wasKnown: knownCards.has(currentCard.id) }])
    setKnownCards((prev) => new Set(prev).add(currentCard.id))
    addMasteredCard(currentCard.id)
    if (unmasteredCardIds.has(currentCard.id)) {
      setUnmasteredCardIds((prev) => {
        const next = new Set(prev)
        next.delete(currentCard.id)
        return next
      })
      removeUnmasteredCard(currentCard.id)
    }
    setFeedback("known")
    setTimeout(() => {
      setFeedback(null)
      if (clampedIndex >= effectiveTotal - 1) {
        setIsFlipped(false)
        setShowCompletion(true)
      } else {
        setShowCompletion(false)
        goNext()
      }
    }, 500)
  }, [currentCard, clampedIndex, effectiveTotal, knownCards, unmasteredCardIds, feedback, snapAndSetFlipped, goNext])

  const handleMarkUnknown = useCallback(() => {
    if (!currentCard || feedback) return
    snapAndSetFlipped(false)
    setHistory((prev) => [...prev, { index: clampedIndex, wasKnown: knownCards.has(currentCard.id) }])
    setKnownCards((prev) => {
      const next = new Set(prev)
      next.delete(currentCard.id)
      return next
    })
    removeMasteredCard(currentCard.id)
    if (!unmasteredCardIds.has(currentCard.id)) {
      setUnmasteredCardIds((prev) => new Set(prev).add(currentCard.id))
      addUnmasteredCard(currentCard.id)
    }
    setFeedback("unknown")
    setTimeout(() => {
      setFeedback(null)
      if (clampedIndex >= effectiveTotal - 1) {
        setIsFlipped(false)
        setShowCompletion(true)
      } else {
        setShowCompletion(false)
        goNext()
      }
    }, 500)
  }, [currentCard, clampedIndex, effectiveTotal, knownCards, unmasteredCardIds, feedback, snapAndSetFlipped, goNext])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    const lastAction = history[history.length - 1]
    snapAndSetFlipped(false)
    setAnimationDirection("left")
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex(lastAction.index)
      setIsFlipped(false)
      const card = effectiveCards[lastAction.index]
      if (!card) return
      if (lastAction.wasKnown) {
        setKnownCards((prev) => new Set(prev).add(card.id))
        addMasteredCard(card.id)
      } else {
        setKnownCards((prev) => {
          const next = new Set(prev)
          next.delete(card.id)
          return next
        })
        removeMasteredCard(card.id)
      }
      setHistory((prev) => prev.slice(0, -1))
      setIsAnimating(false)
    }, 300)
  }, [history, effectiveCards, snapAndSetFlipped])

  const handleModeChange = useCallback((mode: StudyModeType) => {
    if (mode === studyMode) return
    setStudyMode(mode)
    setCurrentIndex(0)
    setIsFlipped(false)
    setHistory([])
    if (mode === "random") {
      setRandomSeed(generateSeed())
    }
  }, [studyMode])

  const handleRegenerateSeed = useCallback(() => {
    setRandomSeed(generateSeed())
    setCurrentIndex(0)
    setIsFlipped(false)
    setHistory([])
  }, [])

  const handleSortChange = useCallback((order: SortOrder) => {
    setSortOrder(order)
    setCurrentIndex(0)
    setIsFlipped(false)
    setHistory([])
  }, [])

  const handleDailyLimitChange = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(200, value))
    setDailyLimit(clamped)
    setCurrentIndex(0)
    setIsFlipped(false)
    setHistory([])
  }, [])

  const handleToggleIncludeMastered = useCallback(() => {
    setIncludeMastered((prev) => !prev)
    setCurrentIndex(0)
    setIsFlipped(false)
    setHistory([])
  }, [])

  const handleStartFocusMode = useCallback(() => {
    setIsFocusMode(true)
    setCurrentIndex(0)
    setIsFlipped(false)
    setHistory([])
    setShowFocusPrompt(false)
  }, [])

  const handleExitFocusMode = useCallback(() => {
    setIsFocusMode(false)
    setCurrentIndex(0)
    setIsFlipped(false)
    setHistory([])
    setUnmasteredCardIds(new Set())
    clearUnmasteredCards()
  }, [])

  const handleClose = useCallback(() => {
    if (hasUnmastered) {
      setShowFocusPrompt(true)
    } else {
      navigate(`/set/${id}`)
    }
  }, [hasUnmastered, id, navigate])

  const handleReset = useCallback(() => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setKnownCards(new Set())
    setHistory([])
    setUnmasteredCardIds(new Set())
    clearUnmasteredCards()
    setIsFocusMode(false)
    setRandomSeed(generateSeed())
    setShowCompletion(false)
    if (id) clearSessionProgress(id)
  }, [id])

  const handleSpeak = useCallback(() => {
    if (currentCard && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(currentCard.term)
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }, [currentCard])

  useEffect(() => {
    if (id) saveSessionProgress(id, sessionProgress)
  }, [id, sessionProgress])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const key = e.key
      if (key === " " && shortcuts.flip === " ") {
        e.preventDefault()
        setIsFlipped((prev) => !prev)
        return
      }
      if (key === shortcuts.flip && key !== " ") {
        e.preventDefault()
        setIsFlipped((prev) => !prev)
        return
      }
      if (key === shortcuts.next) {
        e.preventDefault()
        handleNext()
        return
      }
      if (key === shortcuts.previous) {
        e.preventDefault()
        handlePrevious()
        return
      }
      if (key === shortcuts.markKnown) {
        e.preventDefault()
        handleMarkKnown()
        return
      }
      if (key === shortcuts.markUnknown) {
        e.preventDefault()
        handleMarkUnknown()
        return
      }
      if (key === shortcuts.undo) {
        e.preventDefault()
        handleUndo()
        return
      }
      if (key === shortcuts.reset) {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          handleReset()
        }
        return
      }
      if (key === shortcuts.speak) {
        e.preventDefault()
        handleSpeak()
        return
      }
      if (key === shortcuts.focusMode) {
        e.preventDefault()
        if (isFocusMode) {
          handleExitFocusMode()
        } else if (hasUnmastered) {
          setShowFocusPrompt(true)
        }
        return
      }
      if (key === shortcuts.toggleSettings) {
        e.preventDefault()
        setShowSettings((prev) => !prev)
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    shortcuts, isFocusMode, hasUnmastered,
    handleNext, handlePrevious, handleMarkKnown, handleMarkUnknown,
    handleUndo, handleReset, handleSpeak,
  ])

  if (!studySet || cards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-semibold text-surface-600 dark:text-surface-400">没有卡片</h2>
        <button onClick={() => navigate("/")} className="btn-primary mt-4">
          返回首页
        </button>
      </div>
    )
  }

  if (isFocusMode && focusCards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Target className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-surface-600 dark:text-surface-400 mb-2">全部掌握！</h2>
        <p className="text-surface-400 dark:text-surface-500 mb-6">所有未掌握的单词已经复习完毕</p>
        <button onClick={handleExitFocusMode} className="btn-primary">
          返回编辑学习
        </button>
      </div>
    )
  }

  if (effectiveTotal === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <BookOpen className="w-16 h-16 text-surface-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-surface-600 dark:text-surface-400 mb-2">没有可学习的卡片</h2>
        <p className="text-surface-400 dark:text-surface-500 mb-6">
          请调整学习设置（如启用"包含已掌握单词"）后重试
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => { setIncludeMastered(true); setDailyLimit(0) }} className="btn-primary">
            恢复默认设置
          </button>
          <button onClick={() => navigate(`/set/${id}`)} className="btn-secondary">
            返回详情
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-surface-800">
      {isFocusMode && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            重点学习模式 · {focusCards.length} 个未掌握单词
          </span>
          <button onClick={handleExitFocusMode} className="text-white/80 hover:text-white underline text-xs">
            退出
          </button>
        </div>
      )}

      <div className="px-6 py-3 border-b border-surface-100 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/set/${id}`)}
            className="flex items-center gap-1 text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            返回
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleModeChange("sequential")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                studyMode === "sequential"
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-600"
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              顺序
            </button>
            <button
              onClick={() => handleModeChange("random")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                studyMode === "random"
                  ? "bg-purple-500 text-white shadow-sm"
                  : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-600"
              }`}
            >
              <Shuffle className="w-4 h-4" />
              随机
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings((prev) => !prev)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings
                  ? "bg-brand-100 dark:bg-brand-900/30 text-brand-500"
                  : "hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400"
              }`}
              title="学习设置"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
              title="关闭"
            >
              <CloseIcon className="w-5 h-5 text-surface-500 dark:text-surface-400" />
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="px-6 mb-4 pt-4 animate-fade-in">
          <div className="card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-surface-700 dark:text-surface-300">学习设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300"
              >
                关闭
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">
                  学习模式
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleModeChange("sequential")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      studyMode === "sequential"
                        ? "bg-brand-500 text-white"
                        : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400"
                    }`}
                  >
                    <ListOrdered className="w-4 h-4" />
                    顺序单词卡
                  </button>
                  <button
                    onClick={() => handleModeChange("random")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      studyMode === "random"
                        ? "bg-purple-500 text-white"
                        : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400"
                    }`}
                  >
                    <Shuffle className="w-4 h-4" />
                    随机单词卡
                  </button>
                </div>
              </div>

              {studyMode === "sequential" && (
                <div>
                  <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">
                    排序方式
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSortChange("import")}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        sortOrder === "import"
                          ? "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-700"
                          : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400"
                      }`}
                    >
                      导入顺序
                    </button>
                    <button
                      onClick={() => handleSortChange("alpha")}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        sortOrder === "alpha"
                          ? "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-700"
                          : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400"
                      }`}
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      字母顺序
                    </button>
                  </div>
                </div>
              )}

              {studyMode === "random" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-surface-600 dark:text-surface-400">
                      随机种子
                    </label>
                    <button
                      onClick={handleRegenerateSeed}
                      className="text-xs text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1"
                    >
                      <Shuffle className="w-3 h-3" />
                      重新生成
                    </button>
                  </div>
                  <div className="px-3 py-2 bg-surface-100 dark:bg-surface-700 rounded-lg font-mono text-sm text-surface-600 dark:text-surface-400 select-all">
                    {randomSeed}
                  </div>
                  <p className="text-xs text-surface-400 dark:text-surface-500 mt-1.5">
                    相同种子产生相同随机顺序，可用于复现学习序列
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">
                  每日学习数量
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={dailyLimit}
                    onChange={(e) => handleDailyLimitChange(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-xs text-surface-400 dark:text-surface-500">
                    {dailyLimit === 0 ? "不限制（全部学习）" : `每天最多 ${dailyLimit} 个`}
                  </span>
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
                    包含已掌握单词
                  </span>
                  <button
                    onClick={handleToggleIncludeMastered}
                    className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${
                      includeMastered
                        ? "bg-brand-500"
                        : "bg-surface-300 dark:bg-surface-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        includeMastered ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </label>
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
                  {includeMastered
                    ? "已掌握的单词也会出现在学习队列中"
                    : `已排除 ${knownCards.size} 个已掌握单词`}
                </p>
              </div>
            </div>

            <hr className="border-surface-100 dark:border-surface-700" />

            <button
              onClick={() => setShowShortcutSettings(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-brand-500" />
                <div className="text-left">
                  <div className="text-sm font-medium text-brand-600 dark:text-brand-400">
                    快捷键设置
                  </div>
                  <div className="text-xs text-surface-400 dark:text-surface-500">
                    自定义学习操作的键盘快捷键
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-brand-400" />
            </button>

            <hr className="border-surface-100 dark:border-surface-700" />

            <div>
              <h4 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-3">
                键盘快捷键
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-surface-500 dark:text-surface-400">标记不熟悉并跳下一张</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">←</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500 dark:text-surface-400">标记已掌握并跳下一张</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">→</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500 dark:text-surface-400">仅标记已掌握</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">H</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500 dark:text-surface-400">仅标记不熟悉</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">A</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500 dark:text-surface-400">翻转卡片</span>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">空格</kbd>
                    <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">T</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500 dark:text-surface-400">撤回</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">Z</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500 dark:text-surface-400">重置</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">R</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <div className="text-sm font-medium text-surface-600 dark:text-surface-400">
              {clampedIndex + 1} / {effectiveTotal}
            </div>
            <div className="text-xs text-surface-400 dark:text-surface-500">{studySet.title}</div>
          </div>

          <div className="flex items-center gap-3 text-xs text-surface-400 dark:text-surface-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              已掌握 {knownCards.size}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
              学习中 {unknownCount}
            </span>
          </div>
        </div>

        <div className="flex-1 h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {hasUnmastered && (
          <div className="text-xs text-orange-500 dark:text-orange-400 flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            本次学习有 {unmasteredCardIds.size} 个未掌握单词
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-2 pb-24">
        <div className={`transition-all duration-300 ${
          isAnimating
            ? animationDirection === "right"
              ? "opacity-0 translate-x-8 scale-95"
              : "opacity-0 -translate-x-8 scale-95"
            : "opacity-100 translate-x-0 scale-100"
        } }`} style={{ perspective: "1000px" }}>
          <div
            className="relative w-full min-h-[380px] cursor-pointer"
            onClick={() => setIsFlipped((prev) => !prev)}
            style={{
              transformStyle: "preserve-3d",
              transition: isSnapping
                ? "none"
                : "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: isFlipped ? "rotateX(180deg)" : "rotateX(0deg)",
            }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-2xl bg-white dark:bg-surface-800 shadow-lg border border-surface-100 dark:border-surface-700"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="text-center w-full px-2">
                <h2 className="text-3xl sm:text-4xl font-bold text-surface-800 dark:text-surface-200 text-center break-words leading-relaxed mb-4">
                  {currentCard.term}
                </h2>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSpeak() }}
                  className="mx-auto mb-4 p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 dark:text-surface-500 hover:text-brand-500 transition-colors"
                  title="朗读发音"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                <p className="text-surface-400 dark:text-surface-500 text-sm">点击卡片翻转查看释义</p>
              </div>
            </div>

            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-2xl bg-white dark:bg-surface-800 shadow-lg border border-surface-100 dark:border-surface-700"
              style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
            >
              <div className="text-center w-full px-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-surface-800 dark:text-surface-200 text-center break-words leading-relaxed mb-4">
                  {currentCard.definition}
                </h2>
                <p className="text-surface-400 dark:text-surface-500 text-sm mt-4">点击卡片返回</p>
              </div>
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200 rounded-2xl ${
                feedback ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              style={{
                background: feedback === "known"
                  ? "linear-gradient(135deg, rgba(16,185,129,0.92), rgba(5,150,105,0.92))"
                  : feedback === "unknown"
                    ? "linear-gradient(135deg, rgba(239,68,68,0.92), rgba(220,38,38,0.92))"
                    : "transparent",
                transform: "rotateX(0deg)",
              }}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/30 flex items-center justify-center">
                  {feedback === "known" && <Check className="w-9 h-9 text-white" />}
                  {feedback === "unknown" && <X className="w-9 h-9 text-white" />}
                </div>
                <p className="text-white text-2xl font-bold">
                  {feedback === "known" ? "已掌握" : feedback === "unknown" ? "不熟悉" : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handlePrevious}
              disabled={clampedIndex <= 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              上一张
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={handleMarkUnknown}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-100 hover:border-red-300 transition-all active:scale-95"
                title="不熟悉 (A)"
              >
                <X className="w-6 h-6" />
              </button>

              <button
                onClick={handleMarkKnown}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-700 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-100 hover:border-emerald-300 transition-all active:scale-95"
                title="已掌握 (H)"
              >
                <Check className="w-6 h-6" />
              </button>

              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 text-blue-500 hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                title="撤回 (Z)"
              >
                <Star className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleNext}
              disabled={clampedIndex >= effectiveTotal - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              下一张
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center mt-3">
            <span className="text-xs text-surface-400 dark:text-surface-500">
              按 <kbd className="px-1 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-xs">空格</kbd> 翻转 · 
              <kbd className="px-1 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-xs ml-1">←</kbd><kbd className="px-1 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-xs ml-0.5">→</kbd> 标记并下一张
            </span>
          </div>
        </div>
      </div>

      {showFocusPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-800 rounded-2xl p-8 max-w-md mx-4 text-center animate-fade-in">
            <Target className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-surface-800 dark:text-surface-200 mb-2">重点学习模式</h3>
            <p className="text-surface-500 dark:text-surface-400 mb-2">
              本次学习中有 <span className="font-semibold text-orange-500">{unmasteredCardIds.size}</span> 个单词被标记为未掌握。
            </p>
            <p className="text-surface-400 dark:text-surface-500 text-sm mb-6">
              是否进入重点学习模式，仅复习这些单词？
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={handleStartFocusMode} className="btn-primary flex items-center gap-2">
                <Shuffle className="w-4 h-4" />
                进入重点学习
              </button>
              <button onClick={() => { setShowFocusPrompt(false); navigate(`/set/${id}`) }} className="btn-secondary">
                跳过
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompletion && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-surface-800 rounded-2xl p-8 max-w-md mx-4 text-center animate-fade-in">
          <Check className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-surface-800 dark:text-surface-200 mb-2">学习完成！</h3>
            <p className="text-surface-500 dark:text-surface-400 mb-2">
              已掌握 {knownCards.size}/{effectiveTotal} 张卡片
            </p>
            {hasUnmastered && (
              <p className="text-orange-500 dark:text-orange-400 text-sm mb-4">
                仍有 {unmasteredCardIds.size} 个单词未掌握
              </p>
            )}
            <div className="flex flex-col items-center gap-3">
              {hasUnmastered && (
                <button onClick={handleStartFocusMode} className="btn-primary flex items-center gap-2 w-full justify-center">
                  <Target className="w-4 h-4" />
                  重点复习 {unmasteredCardIds.size} 个未掌握单词
                </button>
              )}
              <div className="flex items-center justify-center gap-3">
                <button onClick={handleReset} className="btn-primary">重新学习</button>
                <button onClick={() => navigate(`/set/${id}`)} className="btn-secondary">返回详情</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showShortcutSettings && (
        <ShortcutSettings
          visible={showShortcutSettings}
          onClose={() => setShowShortcutSettings(false)}
          onShortcutsChanged={setShortcuts}
        />
      )}
    </div>
  )
}