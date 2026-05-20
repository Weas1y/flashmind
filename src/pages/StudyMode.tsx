import { useState, useCallback, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Check,
  X,
  Volume2,
  Settings,
  X as CloseIcon,
  ChevronDown,
  BookOpen,
  Star,
} from "lucide-react"
import { useStore } from "../store/useStore"
import {
  addStudyMinutes,
  recordStudyDay,
  addMasteredCard,
  removeMasteredCard,
} from "../lib/utils"

export default function StudyMode() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { studySets } = useStore()
  const studySet = studySets.find((s) => s.id === id)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set())
  const [isShuffled, setIsShuffled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [history, setHistory] = useState<{ index: number; wasKnown: boolean }[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationDirection, setAnimationDirection] = useState<"left" | "right">("right")
  const [feedback, setFeedback] = useState<"known" | "unknown" | null>(null)

  const sessionStartRef = useRef(Date.now())

  useEffect(() => {
    sessionStartRef.current = Date.now()
    recordStudyDay()
    return () => {
      const elapsed = Math.round((Date.now() - sessionStartRef.current) / 60000)
      if (elapsed > 0) {
        addStudyMinutes(elapsed)
      }
    }
  }, [])

  const cards = studySet?.cards ?? []
  const displayCards = isShuffled
    ? [...cards].sort(() => Math.random() - 0.5)
    : cards

  const currentCard = displayCards[currentIndex]
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0
  const unknownCount = displayCards.length - knownCards.size

  const handleNext = useCallback(() => {
    if (currentIndex < displayCards.length - 1) {
      setAnimationDirection("right")
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex((i) => i + 1)
        setIsFlipped(false)
        setIsAnimating(false)
      }, 300)
    }
  }, [currentIndex, displayCards.length])

  const handleMarkKnown = useCallback(() => {
    if (!currentCard || feedback) return
    setHistory((prev) => [...prev, { index: currentIndex, wasKnown: knownCards.has(currentCard.id) }])
    setKnownCards((prev) => new Set(prev).add(currentCard.id))
    addMasteredCard(currentCard.id)
    setFeedback("known")
    setTimeout(() => {
      setFeedback(null)
      handleNext()
    }, 500)
  }, [currentCard, currentIndex, knownCards, feedback, handleNext])

  const handleMarkUnknown = useCallback(() => {
    if (!currentCard || feedback) return
    setHistory((prev) => [...prev, { index: currentIndex, wasKnown: knownCards.has(currentCard.id) }])
    setKnownCards((prev) => {
      const next = new Set(prev)
      next.delete(currentCard.id)
      return next
    })
    removeMasteredCard(currentCard.id)
    setFeedback("unknown")
    setTimeout(() => {
      setFeedback(null)
      handleNext()
    }, 500)
  }, [currentCard, currentIndex, knownCards, feedback, handleNext])

  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      const lastAction = history[history.length - 1]
      setAnimationDirection("left")
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex(lastAction.index)
        setIsFlipped(false)
        if (lastAction.wasKnown) {
          setKnownCards((prev) => new Set(prev).add(displayCards[lastAction.index].id))
          addMasteredCard(displayCards[lastAction.index].id)
        } else {
          setKnownCards((prev) => {
            const next = new Set(prev)
            next.delete(displayCards[lastAction.index].id)
            return next
          })
          removeMasteredCard(displayCards[lastAction.index].id)
        }
        setHistory((prev) => prev.slice(0, -1))
        setIsAnimating(false)
      }, 300)
    }
  }, [history, displayCards])

  const handleShuffle = useCallback(() => {
    setIsShuffled((prev) => !prev)
    setCurrentIndex(0)
    setIsFlipped(false)
    setHistory([])
  }, [])

  const handleReset = useCallback(() => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setKnownCards(new Set())
    setHistory([])
  }, [])

  const handleSpeak = useCallback(() => {
    if (currentCard && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(currentCard.term)
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }, [currentCard])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case " ":
          e.preventDefault()
          setIsFlipped((prev) => !prev)
          break
        case "ArrowLeft":
          e.preventDefault()
          handleMarkUnknown()
          break
        case "ArrowRight":
          e.preventDefault()
          handleMarkKnown()
          break
        case "h":
        case "H":
          e.preventDefault()
          handleMarkKnown()
          break
        case "a":
        case "A":
          e.preventDefault()
          handleMarkUnknown()
          break
        case "z":
        case "Z":
          e.preventDefault()
          handleUndo()
          break
        case "s":
        case "S":
          e.preventDefault()
          handleShuffle()
          break
        case "r":
        case "R":
          e.preventDefault()
          handleReset()
          break
        case "t":
        case "T":
          e.preventDefault()
          setIsFlipped((prev) => !prev)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleUndo, handleMarkKnown, handleMarkUnknown, handleShuffle, handleReset])

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

  return (
    <div className="min-h-screen bg-white dark:bg-surface-800">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-500" />
          <span className="font-medium text-surface-700 dark:text-surface-300">单词卡</span>
          <ChevronDown className="w-4 h-4 text-surface-400 dark:text-surface-500" />
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-surface-600 dark:text-surface-400">
            {currentIndex + 1} / {displayCards.length}
          </div>
          <div className="text-xs text-surface-400 dark:text-surface-500">{studySet.title}</div>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-sm text-brand-500 hover:text-brand-600 transition-colors">
            用它们提问
          </button>
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
            title="设置"
          >
            <Settings className="w-5 h-5 text-surface-500 dark:text-surface-400" />
          </button>
          <button
            onClick={() => navigate(`/set/${id}`)}
            className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
            title="关闭"
          >
            <CloseIcon className="w-5 h-5 text-surface-500 dark:text-surface-400" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            <span>{unknownCount}</span>
            <span className="text-surface-400 dark:text-surface-500">仍在学</span>
          </span>
          <div className="flex-1 h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-1">
            <span className="text-surface-400 dark:text-surface-500">已了解</span>
            <span>{knownCards.size}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </span>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-6 mb-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-surface-700 dark:text-surface-300">快捷键</span>
              <button
                onClick={() => setShowSettings(false)}
                className="text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300"
              >
                关闭
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-surface-600 dark:text-surface-400">已掌握</span>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">→</kbd>
                  <kbd className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">H</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-surface-600 dark:text-surface-400">仍在学</span>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">←</kbd>
                  <kbd className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">A</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-surface-600 dark:text-surface-400">翻转</span>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">空格</kbd>
                  <kbd className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">T</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-surface-600 dark:text-surface-400">撤回</span>
                <kbd className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">Z</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-surface-600 dark:text-surface-400">随机</span>
                <kbd className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">S</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-surface-600 dark:text-surface-400">重置</span>
                <kbd className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-surface-500">R</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flash Card */}
      <div className="max-w-2xl mx-auto px-6">
        <div className={`transition-all duration-300 ${
          isAnimating
            ? animationDirection === "right"
              ? "opacity-0 translate-x-8 scale-95"
              : "opacity-0 -translate-x-8 scale-95"
            : "opacity-100 translate-x-0 scale-100"
        }`} style={{ perspective: "1000px" }}>
          <div
            className="relative w-full min-h-[400px] cursor-pointer"
            onClick={() => setIsFlipped((prev) => !prev)}
            style={{
              transformStyle: "preserve-3d",
              transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: isFlipped ? "rotateX(180deg)" : "rotateX(0deg)",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-2xl bg-white dark:bg-surface-800 shadow-lg border border-surface-100 dark:border-surface-700"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="text-center w-full px-2">
                <h2 className="text-3xl sm:text-4xl font-bold text-surface-800 dark:text-surface-200 text-center break-words leading-relaxed mb-4">
                  {currentCard.term}
                </h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSpeak()
                  }}
                  className="mx-auto mb-4 p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 dark:text-surface-500 hover:text-brand-500 transition-colors"
                  title="朗读发音"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                <p className="text-surface-400 dark:text-surface-500 text-sm">点击卡片翻转查看释义</p>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-2xl bg-white dark:bg-surface-800 shadow-lg border border-surface-100 dark:border-surface-700"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateX(180deg)",
              }}
            >
              <div className="text-center w-full px-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-surface-800 dark:text-surface-200 text-center break-words leading-relaxed mb-4">
                  {currentCard.definition}
                </h2>
                <p className="text-surface-400 dark:text-surface-500 text-sm mt-4">点击卡片返回</p>
              </div>
            </div>

            {/* Feedback Overlay */}
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

          {/* Bottom Tip */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border-t border-blue-100 px-6 py-3 flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-600">快速翻 按</span>
            <kbd className="px-2 py-0.5 text-xs bg-white dark:bg-surface-800 border border-blue-200 rounded text-blue-600">空格键</kbd>
            <span className="text-xs text-blue-600">或单击卡片以翻页</span>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <button
              onClick={handleMarkUnknown}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-100 hover:border-red-300 transition-all active:scale-95"
              title="不熟悉"
            >
              <X className="w-7 h-7" />
            </button>

            <button
              onClick={handleMarkKnown}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-700 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-100 hover:border-emerald-300 transition-all active:scale-95"
              title="已掌握"
            >
              <Check className="w-7 h-7" />
            </button>

            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 text-blue-500 hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              title="撤回"
            >
              <Star className="w-7 h-7" />
            </button>
          </div>

          {/* Tracking Progress */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-surface-400 dark:text-surface-500">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span>跟踪进度</span>
          </div>
        </div>
      </div>

      {/* Completion State */}
      {currentIndex >= displayCards.length - 1 && isFlipped && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-800 rounded-2xl p-8 max-w-md mx-4 text-center animate-fade-in">
            <Check className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-surface-800 dark:text-surface-200 mb-2">学习完成！</h3>
            <p className="text-surface-500 dark:text-surface-400 mb-6">
              已掌握 {knownCards.size}/{displayCards.length} 张卡片
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={handleReset} className="btn-primary">
                重新学习
              </button>
              <button onClick={() => navigate(`/set/${id}`)} className="btn-secondary">
                返回详情
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
