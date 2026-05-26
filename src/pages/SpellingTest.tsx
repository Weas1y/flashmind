import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  RefreshCw,
  Check,
  X,
  ChevronLeft,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Trophy,
  Clock,
  Target,
  AlertCircle,
  Lightbulb,
  Shuffle,
  Settings,
  Keyboard,
  Play,
  Timer,
  BarChart3,
  ListOrdered,
  TrendingUp,
  SkipForward,
  Hash,
  Gauge,
  Eye,
  Edit3,
} from "lucide-react"
import { useStore } from "../store/useStore"

interface WordDiff {
  text: string
  status: "correct" | "wrong" | "missing" | "extra"
}

interface TestResult {
  cardId: string
  term: string
  definition: string
  userInput: string
  isCorrect: boolean
  diff: WordDiff[]
  timeSpent: number
  skipped: boolean
}

type TestMode = "term-to-def" | "def-to-term"
type CardOrder = "random" | "sequential"
type TestPhase = "config" | "testing" | "report"

interface TestConfig {
  wordCount: number | "all"
  timeLimit: number | null
  order: CardOrder
  mode: TestMode
}

function computeWordDiff(user: string, correct: string): WordDiff[] {
  const userWords = user.trim().split(/\s+/).filter(Boolean)
  const correctWords = correct.trim().split(/\s+/).filter(Boolean)
  const result: WordDiff[] = []
  const maxLen = Math.max(userWords.length, correctWords.length)
  for (let i = 0; i < maxLen; i++) {
    const uw = userWords[i]
    const cw = correctWords[i]
    if (uw && cw) {
      result.push({ text: uw, status: uw.toLowerCase() === cw.toLowerCase() ? "correct" : "wrong" })
    } else if (uw && !cw) {
      result.push({ text: uw, status: "extra" })
    } else if (!uw && cw) {
      result.push({ text: cw, status: "missing" })
    }
  }
  return result
}

function computeCharDiff(user: string, correct: string): Array<{ char: string; status: "correct" | "wrong" | "extra" | "missing" }> {
  const result: Array<{ char: string; status: "correct" | "wrong" | "extra" | "missing" }> = []
  const maxLen = Math.max(user.length, correct.length)
  for (let i = 0; i < maxLen; i++) {
    const uc = user[i]
    const cc = correct[i]
    if (uc && cc) {
      result.push({ char: uc, status: uc.toLowerCase() === cc.toLowerCase() ? "correct" : "wrong" })
    } else if (uc && !cc) {
      result.push({ char: uc, status: "extra" })
    } else if (!uc && cc) {
      result.push({ char: cc, status: "missing" })
    }
  }
  return result
}

function realtimeCharDiff(input: string, correct: string): Array<{ char: string; status: "correct" | "wrong" | "extra" | "pending" }> {
  const result: Array<{ char: string; status: "correct" | "wrong" | "extra" | "pending" }> = []
  for (let i = 0; i < input.length; i++) {
    if (i < correct.length) {
      result.push({ char: input[i], status: input[i].toLowerCase() === correct[i].toLowerCase() ? "correct" : "wrong" })
    } else {
      result.push({ char: input[i], status: "extra" })
    }
  }
  return result
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function getGrade(accuracy: number): { label: string; color: string; emoji: string } {
  if (accuracy >= 95) return { label: "卓越", color: "text-amber-500", emoji: "🏆" }
  if (accuracy >= 85) return { label: "优秀", color: "text-emerald-500", emoji: "🌟" }
  if (accuracy >= 70) return { label: "良好", color: "text-blue-500", emoji: "👍" }
  if (accuracy >= 50) return { label: "及格", color: "text-orange-500", emoji: "📚" }
  return { label: "需努力", color: "text-red-500", emoji: "💪" }
}

export default function SpellingTest() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { studySets } = useStore()
  const studySet = studySets.find((s) => s.id === id)
  const inputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<TestPhase>("config")
  const [config, setConfig] = useState<TestConfig>({
    wordCount: "all",
    timeLimit: null,
    order: "random",
    mode: "term-to-def",
  })

  const [cards, setCards] = useState(studySet?.cards || [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [elapsedTime, setElapsedTime] = useState(0)
  const [wordStartTime, setWordStartTime] = useState(Date.now())
  const [isTimeUp, setIsTimeUp] = useState(false)

  const totalCards = cards.length
  const correctCount = results.filter((r) => r.isCorrect).length
  const wrongCount = results.filter((r) => !r.isCorrect && !r.skipped).length
  const skippedCount = results.filter((r) => r.skipped).length
  const answeredCount = correctCount + wrongCount
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
  const remainingTime = config.timeLimit ? Math.max(0, config.timeLimit - elapsedTime) : null
  const currentCard = cards[currentIndex]

  const startTest = useCallback(() => {
    if (!studySet) return
    let selected = [...studySet.cards]
    if (config.order === "random") {
      selected.sort(() => Math.random() - 0.5)
    }
    if (config.wordCount !== "all" && config.wordCount < selected.length) {
      selected = selected.slice(0, config.wordCount)
    }
    setCards(selected)
    setCurrentIndex(0)
    setUserInput("")
    setSubmitted(false)
    setIsCorrect(false)
    setResults([])
    setElapsedTime(0)
    setWordStartTime(Date.now())
    setIsTimeUp(false)
    setPhase("testing")
  }, [studySet, config])

  useEffect(() => {
    if (phase !== "testing") return
    const timer = setInterval(() => {
      setElapsedTime((prev) => {
        const next = prev + 1
        if (config.timeLimit && next >= config.timeLimit) {
          setIsTimeUp(true)
          return config.timeLimit
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [phase, config.timeLimit])

  useEffect(() => {
    if (isTimeUp && phase === "testing") {
      setPhase("report")
    }
  }, [isTimeUp, phase])

  useEffect(() => {
    if (phase === "testing" && !submitted && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentIndex, submitted, phase])

  useEffect(() => {
    if (phase === "testing") {
      setWordStartTime(Date.now())
    }
  }, [currentIndex, phase])

  const handleSubmit = useCallback(() => {
    if (!currentCard || submitted) return
    const correctAnswer = config.mode === "term-to-def" ? currentCard.definition : currentCard.term
    const trimmed = userInput.trim()
    if (!trimmed) return

    const isAnswerCorrect = trimmed.toLowerCase() === correctAnswer.toLowerCase()
    const diff = computeWordDiff(trimmed, correctAnswer)
    const timeSpent = Math.round((Date.now() - wordStartTime) / 1000)

    setIsCorrect(isAnswerCorrect)
    setSubmitted(true)

    const newResult: TestResult = {
      cardId: currentCard.id,
      term: currentCard.term,
      definition: currentCard.definition,
      userInput: trimmed,
      isCorrect: isAnswerCorrect,
      diff,
      timeSpent,
      skipped: false,
    }

    setResults((prev) => {
      const existing = prev.findIndex((r) => r.cardId === currentCard.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newResult
        return updated
      }
      return [...prev, newResult]
    })
  }, [currentCard, submitted, userInput, config.mode, wordStartTime])

  const handleSkip = useCallback(() => {
    if (!currentCard || submitted) return
    const timeSpent = Math.round((Date.now() - wordStartTime) / 1000)
    const correctAnswer = config.mode === "term-to-def" ? currentCard.definition : currentCard.term
    const newResult: TestResult = {
      cardId: currentCard.id,
      term: currentCard.term,
      definition: currentCard.definition,
      userInput: "",
      isCorrect: false,
      diff: computeWordDiff("", correctAnswer),
      timeSpent,
      skipped: true,
    }
    setResults((prev) => [...prev, newResult])
    setSubmitted(true)
    setIsCorrect(false)
  }, [currentCard, submitted, config.mode, wordStartTime])

  const handleNext = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((i) => i + 1)
      setUserInput("")
      setSubmitted(false)
      setIsCorrect(false)
    } else {
      setPhase("report")
    }
  }, [currentIndex, totalCards])

  const handlePrevAnswer = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setUserInput("")
      setSubmitted(false)
      setIsCorrect(false)
    }
  }, [currentIndex])

  const handleRestartWrong = useCallback(() => {
    const wrongResults = results.filter((r) => !r.isCorrect)
    if (wrongResults.length === 0) {
      startTest()
      return
    }
    const wrongCards = wrongResults.map((r) => studySet!.cards.find((c) => c.id === r.cardId)!).filter(Boolean)
    setCards(wrongCards)
    setCurrentIndex(0)
    setUserInput("")
    setSubmitted(false)
    setIsCorrect(false)
    setResults([])
    setElapsedTime(0)
    setWordStartTime(Date.now())
    setIsTimeUp(false)
    setPhase("testing")
  }, [results, studySet, startTest])

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !submitted) {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === "Enter" && submitted) {
        e.preventDefault()
        handleNext()
      } else if (e.key === "Escape" && !submitted) {
        e.preventDefault()
        handleSkip()
      }
    },
    [submitted, handleSubmit, handleNext, handleSkip]
  )

  const handleGoToConfig = useCallback(() => {
    setPhase("config")
    setResults([])
    setElapsedTime(0)
  }, [])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (phase === "report") {
        if (e.key === "r" || e.key === "R") { e.preventDefault(); startTest() }
        else if (e.key === "w" || e.key === "W") { e.preventDefault(); handleRestartWrong() }
        else if (e.key === "Escape") { e.preventDefault(); navigate(`/set/${id}`) }
        return
      }

      if (phase === "testing") {
        if (submitted) {
          if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); handleNext() }
          else if (e.key === "ArrowLeft") { e.preventDefault(); handlePrevAnswer() }
        }
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [phase, submitted, handleNext, handlePrevAnswer, startTest, handleRestartWrong, id, navigate])

  const wordCountOptions: { label: string; value: number | "all" }[] = [
    { label: "全部", value: "all" },
    { label: "5", value: 5 },
    { label: "10", value: 10 },
    { label: "15", value: 15 },
    { label: "20", value: 20 },
    { label: "30", value: 30 },
  ]

  const timeLimitOptions: { label: string; value: number | null }[] = [
    { label: "无限制", value: null },
    { label: "3 分钟", value: 180 },
    { label: "5 分钟", value: 300 },
    { label: "10 分钟", value: 600 },
    { label: "15 分钟", value: 900 },
  ]

  if (!studySet) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <BookOpen className="w-16 h-16 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-surface-600 dark:text-surface-400">学习集未找到</h2>
        <button onClick={() => navigate("/")} className="btn-primary mt-4">
          返回首页
        </button>
      </div>
    )
  }

  const totalAvailable = studySet.cards.length
  const effectiveCount = config.wordCount === "all" ? totalAvailable : Math.min(config.wordCount, totalAvailable)

  if (phase === "config") {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
        <div className="max-w-lg mx-auto px-4 py-6 sm:py-10">
          <button
            onClick={() => navigate(`/set/${id}`)}
            className="flex items-center gap-1.5 text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回学习集
          </button>

          <div className="card p-6 sm:p-8 animate-float-up">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-brand-500 flex items-center justify-center mb-5 shadow-lg shadow-accent-500/20">
              <Edit3 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 font-display mb-1">拼写练习</h1>
            <p className="text-surface-500 dark:text-surface-400 text-sm mb-6">{studySet.title} · {totalAvailable} 个单词</p>

            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                  <ListOrdered className="w-4 h-4 text-brand-500" />
                  测试模式
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfig((c) => ({ ...c, mode: "term-to-def" }))}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      config.mode === "term-to-def"
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                        : "border-surface-200 dark:border-surface-600 text-surface-500 dark:text-surface-400 hover:border-surface-300"
                    }`}
                  >
                    <Eye className="w-4 h-4 mx-auto mb-1" />
                    看术语写释义
                  </button>
                  <button
                    onClick={() => setConfig((c) => ({ ...c, mode: "def-to-term" }))}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      config.mode === "def-to-term"
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                        : "border-surface-200 dark:border-surface-600 text-surface-500 dark:text-surface-400 hover:border-surface-300"
                    }`}
                  >
                    <Edit3 className="w-4 h-4 mx-auto mb-1" />
                    看释义写术语
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                  <Hash className="w-4 h-4 text-accent-500" />
                  单词数量
                </label>
                <div className="flex flex-wrap gap-2">
                  {wordCountOptions.map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setConfig((c) => ({ ...c, wordCount: opt.value }))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                        config.wordCount === opt.value
                          ? "border-accent-500 bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 shadow-sm"
                          : "border-surface-200 dark:border-surface-600 text-surface-500 dark:text-surface-400 hover:border-surface-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-2">
                  将测试 {effectiveCount} 个单词
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                  <Timer className="w-4 h-4 text-orange-500" />
                  时间限制
                </label>
                <div className="flex flex-wrap gap-2">
                  {timeLimitOptions.map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setConfig((c) => ({ ...c, timeLimit: opt.value }))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                        config.timeLimit === opt.value
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 shadow-sm"
                          : "border-surface-200 dark:border-surface-600 text-surface-500 dark:text-surface-400 hover:border-surface-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                  <Shuffle className="w-4 h-4 text-purple-500" />
                  抽取顺序
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfig((c) => ({ ...c, order: "random" }))}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      config.order === "random"
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        : "border-surface-200 dark:border-surface-600 text-surface-500 dark:text-surface-400 hover:border-surface-300"
                    }`}
                  >
                    <Shuffle className="w-4 h-4 mx-auto mb-1" />
                    随机
                  </button>
                  <button
                    onClick={() => setConfig((c) => ({ ...c, order: "sequential" }))}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      config.order === "sequential"
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        : "border-surface-200 dark:border-surface-600 text-surface-500 dark:text-surface-400 hover:border-surface-300"
                    }`}
                  >
                    <ListOrdered className="w-4 h-4 mx-auto mb-1" />
                    按顺序
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={startTest}
              className="mt-7 btn-primary w-full flex items-center justify-center gap-2 text-base py-3.5 shadow-lg shadow-brand-500/20"
            >
              <Play className="w-5 h-5" />
              开始练习 ({effectiveCount} 题{config.timeLimit ? ` · ${config.timeLimit / 60}分钟` : ""})
            </button>

            <p className="text-xs text-surface-400 dark:text-surface-500 text-center mt-4">
              提示：测试中按 <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded font-mono border border-surface-200 dark:border-surface-600">Esc</kbd> 跳过当前单词
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "report") {
    const totalTime = config.timeLimit && isTimeUp ? config.timeLimit : elapsedTime
    const avgTimePerWord = answeredCount > 0 ? Math.round(totalTime / answeredCount) : 0
    const grade = getGrade(accuracy)
    const wrongResults = results.filter((r) => !r.isCorrect)

    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
          <div className="card p-6 sm:p-8 animate-float-up">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/20">
                <span className="text-3xl">{grade.emoji}</span>
              </div>
              <h2 className={`text-2xl sm:text-3xl font-bold font-display mb-1 ${grade.color}`}>
                {grade.label}
              </h2>
              <p className="text-surface-500 dark:text-surface-400">拼写练习完成</p>
              {isTimeUp && (
                <p className="text-orange-500 text-sm mt-1 flex items-center justify-center gap-1">
                  <Timer className="w-3.5 h-3.5" />
                  时间到，练习已自动结束
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="bg-surface-50 dark:bg-surface-900 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">{totalCards}</p>
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">总题数</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{correctCount}</p>
                <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">正确</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-500 dark:text-red-400">{wrongCount}</p>
                <p className="text-xs text-red-400 dark:text-red-500 mt-1">错误</p>
              </div>
              <div className="bg-brand-50 dark:bg-brand-900/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{accuracy}%</p>
                <p className="text-xs text-brand-400 mt-1">正确率</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-900">
                <Clock className="w-5 h-5 text-surface-400 dark:text-surface-500" />
                <div>
                  <p className="text-lg font-bold text-surface-700 dark:text-surface-300">{formatTime(totalTime)}</p>
                  <p className="text-xs text-surface-400 dark:text-surface-500">总用时</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-900">
                <Gauge className="w-5 h-5 text-surface-400 dark:text-surface-500" />
                <div>
                  <p className="text-lg font-bold text-surface-700 dark:text-surface-300">{avgTimePerWord}s</p>
                  <p className="text-xs text-surface-400 dark:text-surface-500">平均每题</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-900">
                <Target className="w-5 h-5 text-surface-400 dark:text-surface-500" />
                <div>
                  <p className="text-lg font-bold text-surface-700 dark:text-surface-300">{config.mode === "term-to-def" ? "看词写义" : "看义写词"}</p>
                  <p className="text-xs text-surface-400 dark:text-surface-500">测试模式</p>
                </div>
              </div>
              {skippedCount > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/30">
                  <SkipForward className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{skippedCount}</p>
                    <p className="text-xs text-amber-500">跳过</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-brand-500" />
                <h3 className="font-semibold text-surface-800 dark:text-surface-200">正确率趋势</h3>
              </div>
              <div className="bg-surface-100 dark:bg-surface-700 rounded-xl h-10 flex items-end overflow-hidden">
                {(() => {
                  const chunkSize = Math.max(1, Math.ceil(results.length / 30))
                  const chunks: { correct: number; total: number }[] = []
                  for (let i = 0; i < results.length; i += chunkSize) {
                    const slice = results.slice(i, i + chunkSize)
                    chunks.push({
                      correct: slice.filter((r) => r.isCorrect).length,
                      total: slice.length,
                    })
                  }
                  return chunks.map((chunk, i) => {
                    const pct = chunk.total > 0 ? (chunk.correct / chunk.total) * 100 : 0
                    return (
                      <div
                        key={i}
                        className="flex-1 mx-px rounded-t transition-all duration-300"
                        style={{
                          height: `${Math.max(4, pct)}%`,
                          backgroundColor: pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444",
                        }}
                        title={`${chunk.correct}/${chunk.total}`}
                      />
                    )
                  })
                })()}
              </div>
              <div className="flex justify-between text-[10px] text-surface-400 dark:text-surface-500 mt-1">
                <span>开始</span>
                <span>结束</span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-500" />
                逐词详情
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
                {results.map((r, i) => (
                  <div
                    key={r.cardId}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-colors ${
                      r.skipped ? "bg-amber-50 dark:bg-amber-900/30" : r.isCorrect ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-red-50 dark:bg-red-900/30"
                    }`}
                  >
                    <span className="text-xs font-mono text-surface-400 dark:text-surface-500 w-5 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-800 dark:text-surface-200 truncate">{r.term}</p>
                      <p className="text-xs text-surface-400 dark:text-surface-500 truncate">{r.definition}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-surface-400 dark:text-surface-500 font-mono">{r.timeSpent}s</span>
                      {r.skipped ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-700 dark:text-amber-300">跳过</span>
                      ) : r.isCorrect ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {wrongResults.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  需要复习 ({wrongResults.length})
                </h3>
                <div className="space-y-3">
                  {wrongResults.map((r) => (
                    <div key={r.cardId} className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                          {r.skipped ? (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <SkipForward className="w-3.5 h-3.5" />已跳过 · {config.mode === "term-to-def" ? r.term : r.definition}
                            </span>
                          ) : (
                            config.mode === "term-to-def" ? r.term : r.definition
                          )}
                        </p>
                        {!r.skipped && <X className="w-4 h-4 text-red-400 shrink-0" />}
                      </div>
                      {!r.skipped && (
                        <>
                          <div className="text-sm">
                            <p className="text-red-500 line-through mb-1">你的答案：{r.userInput}</p>
                            <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <Lightbulb className="w-3.5 h-3.5" />
                              正确答案：{config.mode === "term-to-def" ? r.definition : r.term}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1 text-xs">
                            {r.diff.map((d, j) => (
                              <span
                                key={j}
                                className={`px-1.5 py-0.5 rounded ${
                                  d.status === "correct"
                                    ? "bg-emerald-200 text-emerald-700 dark:text-emerald-300"
                                    : d.status === "wrong"
                                    ? "bg-red-200 text-red-700"
                                    : d.status === "missing"
                                    ? "bg-amber-200 text-amber-700 dark:text-amber-300 line-through"
                                    : "bg-red-300 text-red-800 line-through"
                                }`}
                              >
                                {d.status === "missing" ? "___" : d.text}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                      {r.skipped && (
                        <div className="text-sm mt-2">
                          <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <Lightbulb className="w-3.5 h-3.5" />
                            正确答案：{config.mode === "term-to-def" ? r.definition : r.term}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button onClick={startTest} className="btn-primary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                重新练习
              </button>
              {wrongResults.length > 0 && (
                <button onClick={handleRestartWrong} className="btn-accent flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  只练错词 ({wrongResults.length})
                </button>
              )}
              <button onClick={handleGoToConfig} className="btn-secondary flex items-center gap-2">
                <Settings className="w-4 h-4" />
                调整配置
              </button>
              <button onClick={() => navigate(`/set/${id}`)} className="btn-ghost">
                返回
              </button>
            </div>

            <p className="text-xs text-surface-400 dark:text-surface-500 text-center mt-4">
              按 <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded font-mono border border-surface-200 dark:border-surface-600">R</kbd> 重新练习 · 按 <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded font-mono border border-surface-200 dark:border-surface-600">W</kbd> 只练错词 · 按 <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded font-mono border border-surface-200 dark:border-surface-600">Esc</kbd> 返回
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/set/${id}`)}
            className="flex items-center gap-1.5 text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleGoToConfig} className="btn-ghost p-2" title="调整配置">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={startTest} className="btn-ghost p-2" title="重新开始">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-surface-400 dark:text-surface-500">
            第 {currentIndex + 1} / {totalCards} 题
          </span>
          <div className="flex items-center gap-4">
            {remainingTime !== null && (
              <span className={`text-sm font-mono flex items-center gap-1 ${remainingTime <= 60 ? "text-red-500 animate-pulse" : "text-surface-400 dark:text-surface-500"}`}>
                <Timer className="w-3.5 h-3.5" />
                {formatTime(remainingTime)}
              </span>
            )}
            <span className="text-sm text-surface-400 dark:text-surface-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>

        <div className="w-full h-2 bg-surface-200 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + (submitted ? 1 : 0)) / totalCards) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between mb-4 text-xs text-surface-400 dark:text-surface-500">
          <span>✅ {correctCount} 正确</span>
          <span>正确率 {answeredCount > 0 ? accuracy : 0}%</span>
          <span>❌ {wrongCount + skippedCount} 错误/跳过</span>
        </div>

        <div className="card p-6 sm:p-8 mb-6">
          <div className="text-center mb-6">
            <span className="text-xs text-surface-400 dark:text-surface-500 font-medium uppercase tracking-wider">
              {config.mode === "term-to-def" ? "请拼写对应的释义" : "请拼写对应的术语"}
            </span>
          </div>

          <div className="bg-gradient-to-br from-brand-50 dark:from-brand-900/30 to-accent-50 dark:to-accent-900/30 rounded-2xl p-6 sm:p-8 mb-6 text-center border border-brand-100 dark:border-brand-700">
            <p className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-100 font-display">
              {config.mode === "term-to-def" ? currentCard?.term : currentCard?.definition}
            </p>
            {config.mode === "term-to-def" && (
              <p className="text-xs text-surface-400 dark:text-surface-500 mt-2">输入对应的英语释义</p>
            )}
            {config.mode === "def-to-term" && (
              <p className="text-xs text-surface-400 dark:text-surface-500 mt-2">输入对应的英语术语</p>
            )}
          </div>

          {!submitted ? (
            <div className="space-y-3">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={config.mode === "term-to-def" ? "输入释义..." : "输入术语..."}
                className="input-field text-center text-lg"
                autoComplete="off"
                autoFocus
              />

              {userInput.length > 0 && (
                <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-700 min-h-[2.5rem]">
                  <div className="flex flex-wrap gap-x-0.5 text-sm font-mono justify-center">
                    {realtimeCharDiff(
                      userInput,
                      (config.mode === "term-to-def" ? currentCard?.definition : currentCard?.term) || ""
                    ).map((seg, i) => (
                      <span
                        key={i}
                        className={`${
                          seg.status === "correct"
                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded px-0.5"
                            : seg.status === "wrong"
                            ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded px-0.5 underline decoration-red-300"
                            : "text-red-400 dark:text-red-500 bg-red-50 dark:bg-red-900/30 rounded px-0.5 line-through"
                        }`}
                      >
                        {seg.char}
                      </span>
                    ))}
                    {(() => {
                      const correctAnswer = (config.mode === "term-to-def" ? currentCard?.definition : currentCard?.term) || ""
                      if (userInput.length < correctAnswer.length) {
                        return (
                          <span className="text-surface-300 dark:text-surface-600 bg-surface-100 dark:bg-surface-700 rounded px-0.5">
                            {correctAnswer.slice(userInput.length)}
                          </span>
                        )
                      }
                      return null
                    })()}
                  </div>
                  {userInput.length > 0 && (
                    <p className="text-xs text-surface-400 dark:text-surface-500 text-center mt-1.5">
                      正确：{currentCard && (config.mode === "term-to-def" ? currentCard.definition : currentCard.term)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={!userInput.trim()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 py-3"
                >
                  <Check className="w-5 h-5" />
                  提交答案
                </button>
                <button
                  onClick={handleSkip}
                  className="btn-ghost p-3 text-surface-400 dark:text-surface-500 hover:text-amber-500 hover:bg-amber-50 rounded-xl flex-shrink-0"
                  title="跳过 (Esc)"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-center text-surface-400 dark:text-surface-500">
                按 <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded font-mono border border-surface-200 dark:border-surface-600">Enter</kbd> 提交 · 按 <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded font-mono border border-surface-200 dark:border-surface-600">Esc</kbd> 跳过
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {isCorrect ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-6 text-center animate-float-up">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300 mb-1">完全正确！</p>
                  <p className="text-sm text-emerald-500 dark:text-emerald-400">
                    {config.mode === "term-to-def" ? currentCard?.term : currentCard?.definition}
                    {" → "}
                    {config.mode === "term-to-def" ? currentCard?.definition : currentCard?.term}
                  </p>
                </div>
              ) : (
                <div className="border border-red-200 dark:border-red-700 rounded-2xl overflow-hidden animate-float-up">
                  <div className="bg-red-50 dark:bg-red-900/30 p-4 border-b border-red-100 dark:border-red-800">
                    <div className="flex items-center gap-2">
                      <X className="w-5 h-5 text-red-500 shrink-0" />
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">拼写有误</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-4 bg-white dark:bg-surface-800">
                    <div>
                      <p className="text-xs text-surface-400 dark:text-surface-500 mb-1.5">你的答案</p>
                      <div className="p-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-xl">
                        <div className="flex flex-wrap gap-x-1">
                          {computeCharDiff(userInput.trim(), config.mode === "term-to-def" ? currentCard?.definition || "" : currentCard?.term || "").map((seg, i) => (
                            <span
                              key={i}
                              className={`${
                                seg.status === "correct"
                                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded px-0.5"
                                  : seg.status === "wrong"
                                  ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded px-0.5"
                                  : seg.status === "extra"
                                  ? "text-red-400 dark:text-red-500 bg-red-100 rounded px-0.5 line-through"
                                  : "text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded px-0.5 border-b-2 border-dashed border-amber-300"
                              }`}
                            >
                              {seg.status === "missing" ? "·" : seg.char}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-surface-400 dark:text-surface-500 mb-1.5 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-amber-500" />
                        正确答案
                      </p>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                        <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                          {config.mode === "term-to-def" ? currentCard?.definition : currentCard?.term}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-surface-400 dark:text-surface-500 mb-1.5">逐词对比</p>
                      <div className="flex flex-wrap gap-1.5">
                        {computeWordDiff(userInput.trim(), config.mode === "term-to-def" ? currentCard?.definition || "" : currentCard?.term || "").map((d, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded-lg text-sm font-medium ${
                              d.status === "correct"
                                ? "bg-emerald-100 text-emerald-700 dark:text-emerald-300"
                                : d.status === "wrong"
                                ? "bg-red-100 text-red-600 dark:text-red-400"
                                : d.status === "missing"
                                ? "bg-amber-100 text-amber-600 dark:text-amber-400 border border-dashed border-amber-300"
                                : "bg-red-50 dark:bg-red-900/30 text-red-400 dark:text-red-500 line-through"
                            }`}
                          >
                            {d.status === "missing" ? "___" : d.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleNext}
                className="btn-primary w-full flex items-center justify-center gap-2"
                autoFocus
              >
                {currentIndex < totalCards - 1 ? (
                  <>
                    下一题
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    查看结果
                    <Trophy className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handlePrevAnswer}
                  disabled={currentIndex === 0}
                  className="btn-ghost text-sm disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4 inline" />
                  上一题
                </button>
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  {correctCount} 正确 / {wrongCount} 错误
                </span>
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  正确率 {accuracy}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-surface-400 dark:text-surface-500 flex-wrap">
          <Keyboard className="w-3.5 h-3.5" />
          <p>
            {submitted ? (
              <>
                <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded font-mono border border-surface-200 dark:border-surface-600">Space</kbd>
                {" "}下一题{" · "}
                <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded font-mono border border-surface-200 dark:border-surface-600">←</kbd>
                {" "}返回
              </>
            ) : (
              <>
                <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded font-mono border border-surface-200 dark:border-surface-600">Enter</kbd>
                {" "}提交{" · "}
                <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded font-mono border border-surface-200 dark:border-surface-600">Esc</kbd>
                {" "}跳过
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}