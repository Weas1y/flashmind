import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  RefreshCw,
  Timer,
  Star,
  Check,
} from "lucide-react"
import { useStore } from "../store/useStore"

interface CardItem {
  id: string
  text: string
  type: "term" | "definition"
  pairId: string
  matched: boolean
}

export default function MatchGame() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { studySets } = useStore()
  const studySet = studySets.find((s) => s.id === id)

  const [cards, setCards] = useState<CardItem[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [moves, setMoves] = useState(0)
  const [time, setTime] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // Initialize game
  useEffect(() => {
    if (!studySet) return

    const gameCards: CardItem[] = []
    studySet.cards.slice(0, 6).forEach((card) => {
      gameCards.push({
        id: `term-${card.id}`,
        text: card.term,
        type: "term",
        pairId: card.id,
        matched: false,
      })
      gameCards.push({
        id: `def-${card.id}`,
        text: card.definition,
        type: "definition",
        pairId: card.id,
        matched: false,
      })
    })

    // Shuffle
    const shuffled = [...gameCards].sort(() => Math.random() - 0.5)
    setCards(shuffled)
    setMatchedPairs(0)
    setMoves(0)
    setTime(0)
    setIsComplete(false)
    setIsTimerRunning(true)
    setSelected([])
  }, [studySet])

  // Timer
  useEffect(() => {
    if (!isTimerRunning) return
    const interval = setInterval(() => {
      setTime((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const handleSelect = useCallback(
    (cardId: string) => {
      if (selected.length >= 2) return

      const card = cards.find((c) => c.id === cardId)
      if (!card || card.matched) return
      if (selected.includes(cardId)) return

      const newSelected = [...selected, cardId]
      setSelected(newSelected)

      if (newSelected.length === 2) {
        setIsTimerRunning(false)
        setMoves((m) => m + 1)

        const first = cards.find((c) => c.id === newSelected[0])!
        const second = cards.find((c) => c.id === newSelected[1])!

        if (first.pairId === second.pairId && first.type !== second.type) {
          // Match!
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === first.id || c.id === second.id ? { ...c, matched: true } : c
              )
            )
            setMatchedPairs((p) => p + 1)
            setSelected([])
            setIsTimerRunning(true)
          }, 500)
        } else {
          // No match
          setTimeout(() => {
            setSelected([])
            setIsTimerRunning(true)
          }, 1000)
        }
      }
    },
    [selected, cards]
  )

  // Check completion
  useEffect(() => {
    if (matchedPairs > 0 && matchedPairs === cards.length / 2) {
      setIsComplete(true)
      setIsTimerRunning(false)
    }
  }, [matchedPairs, cards.length])

  const handleReset = useCallback(() => {
    if (!studySet) return
    const gameCards: CardItem[] = []
    studySet.cards.slice(0, 6).forEach((card) => {
      gameCards.push({
        id: `term-${card.id}`,
        text: card.term,
        type: "term",
        pairId: card.id,
        matched: false,
      })
      gameCards.push({
        id: `def-${card.id}`,
        text: card.definition,
        type: "definition",
        pairId: card.id,
        matched: false,
      })
    })
    setCards(gameCards.sort(() => Math.random() - 0.5))
    setMatchedPairs(0)
    setMoves(0)
    setTime(0)
    setIsComplete(false)
    setIsTimerRunning(true)
    setSelected([])
  }, [studySet])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  if (!studySet) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-semibold text-surface-600 dark:text-surface-400">学习集未找到</h2>
        <button onClick={() => navigate("/")} className="btn-primary mt-4">
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/set/${id}`)}
            className="flex items-center gap-1.5 text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <h1 className="text-lg font-semibold text-surface-800 dark:text-surface-200 hidden sm:block">匹配游戏</h1>
          <button onClick={handleReset} className="btn-ghost p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
            <Timer className="w-4 h-4" />
            {formatTime(time)}
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
            <Star className="w-4 h-4" />
            步数: {moves}
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
            <Check className="w-4 h-4" />
            配对: {matchedPairs}/{cards.length / 2}
          </div>
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {cards.map((card) => {
            const isSelected = selected.includes(card.id)
            const isMatched = card.matched

            return (
              <button
                key={card.id}
                onClick={() => handleSelect(card.id)}
                disabled={isMatched}
                className={`min-h-[100px] sm:min-h-[120px] p-3 rounded-xl text-sm transition-all duration-300 ${
                  isMatched
                    ? "bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-300 opacity-60"
                    : isSelected
                    ? "bg-brand-50 dark:bg-brand-900/30 border-2 border-brand-400 shadow-md scale-[1.02]"
                    : "bg-white dark:bg-surface-800 border-2 border-surface-200 dark:border-surface-600 hover:border-brand-300 hover:shadow-md"
                }`}
              >
                <div
                  className={`h-full flex items-center justify-center text-center font-medium ${
                    isMatched
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isSelected
                      ? "text-brand-700 dark:text-brand-300"
                      : "text-surface-600 dark:text-surface-400"
                  }`}
                >
                  <span className="line-clamp-4 text-xs sm:text-sm">
                    {card.text}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Completion */}
        {isComplete && (
          <div className="mt-8 card p-6 text-center animate-float-up">
            <Check className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-surface-800 dark:text-surface-200 font-display mb-1">
              恭喜过关！
            </h3>
            <p className="text-surface-400 dark:text-surface-500 mb-1">
              用时 {formatTime(time)}，共 {moves} 步
            </p>
            <p className="text-surface-400 dark:text-surface-500 text-sm mb-4">
              你已经掌握了这个学习集的内容！
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={handleReset} className="btn-primary">
                再来一局
              </button>
              <button onClick={() => navigate(`/set/${id}/study`)} className="btn-secondary">
                闪卡学习
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
