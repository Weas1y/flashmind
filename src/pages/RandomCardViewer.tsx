import { useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Shuffle,
  Volume2,
  BookOpen,
  ChevronRight,
} from "lucide-react"
import { useStore } from "../store/useStore"

export default function RandomCardViewer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { studySets } = useStore()
  const studySet = studySets.find((s) => s.id === id)

  const [currentCard, setCurrentCard] = useState<{
    term: string
    definition: string
    id: string
  } | null>(null)
  const [lastCardId, setLastCardId] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pickCount, setPickCount] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)

  const pickRandomCard = useCallback(() => {
    if (!studySet || studySet.cards.length === 0) return

    const pool = studySet.cards.length === 1
      ? studySet.cards
      : studySet.cards.filter((c) => c.id !== lastCardId)

    const randomIdx = Math.floor(Math.random() * pool.length)
    const picked = pool[randomIdx]

    setIsTransitioning(true)
    setIsRevealed(false)
    setTimeout(() => {
      setCurrentCard(picked)
      setLastCardId(picked.id)
      setPickCount((prev) => prev + 1)
      setIsTransitioning(false)
    }, 250)
  }, [studySet, lastCardId])

  const handleSpeak = useCallback(() => {
    if (currentCard && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(currentCard.term)
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }, [currentCard])

  if (!studySet) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <BookOpen className="w-16 h-16 text-surface-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-surface-600 dark:text-surface-400 mb-2">学习集未找到</h2>
        <button onClick={() => navigate("/")} className="btn-primary">
          返回首页
        </button>
      </div>
    )
  }

  if (studySet.cards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <BookOpen className="w-16 h-16 text-surface-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-surface-600 dark:text-surface-400 mb-2">该学习集没有卡片</h2>
        <button onClick={() => navigate(`/set/${id}`)} className="btn-primary">
          返回详情
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-surface-800">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate(`/set/${id}`)}
          className="flex items-center gap-1.5 text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回详情
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-medium mb-3">
            <Shuffle className="w-4 h-4" />
            随机单词卡
          </div>
          <h1 className="text-xl font-bold text-surface-800 dark:text-surface-200">
            {studySet.title}
          </h1>
          <p className="text-surface-400 dark:text-surface-500 text-sm mt-1">
            {studySet.cardCount} 张卡片
            {pickCount > 0 && ` · 已随机抽取 ${pickCount} 次`}
          </p>
        </div>

        <div
          className={`transition-all duration-300 ${
            isTransitioning
              ? "opacity-0 translate-y-4 scale-95"
              : "opacity-100 translate-y-0 scale-100"
          }`}
        >
          {currentCard ? (
            <div className="card p-8 sm:p-10">
              <div
                className="text-center cursor-pointer select-none"
                onClick={() => setIsRevealed((prev) => !prev)}
              >
                <div className="mb-4">
                  <span className="text-6xl sm:text-7xl">
                    {isRevealed ? "📖" : "📗"}
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-surface-800 dark:text-surface-200 break-words leading-relaxed mb-3">
                  {currentCard.term}
                </h2>

                {isRevealed && (
                  <div className="animate-fade-in">
                    <div className="w-12 h-0.5 bg-gradient-to-r from-purple-400 to-orange-400 mx-auto my-4 rounded-full" />
                    <p className="text-xl sm:text-2xl text-surface-600 dark:text-surface-400 break-words leading-relaxed">
                      {currentCard.definition}
                    </p>
                  </div>
                )}

                {!isRevealed && (
                  <p className="text-surface-400 dark:text-surface-500 text-sm mt-4">
                    点击卡片查看释义
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 mt-6 pt-6 border-t border-surface-100 dark:border-surface-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSpeak()
                  }}
                  className="p-2.5 rounded-full hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 dark:text-surface-500 hover:text-brand-500 transition-colors"
                  title="朗读发音"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                <span className="text-xs text-surface-400 dark:text-surface-500">
                  点击卡片{isRevealed ? "隐藏" : "显示"}释义
                </span>
              </div>
            </div>
          ) : (
            <div className="card p-12 sm:p-16 text-center">
              <div className="mb-6">
                <span className="text-7xl">🎲</span>
              </div>
              <h3 className="text-xl font-semibold text-surface-600 dark:text-surface-400 mb-2">
                准备好了吗？
              </h3>
              <p className="text-surface-400 dark:text-surface-500 mb-2">
                点击下方按钮，从 {studySet.cardCount} 张卡片中随机抽取一张
              </p>
              {lastCardId !== null && (
                <p className="text-surface-400 dark:text-surface-500 text-sm">
                  已确保不会与上一张重复
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={pickRandomCard}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-600 hover:to-orange-600 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 active:scale-95 text-lg"
          >
            <Shuffle className="w-6 h-6" />
            {currentCard ? "再来一张" : "随机一张"}
          </button>

          {currentCard && (
            <button
              onClick={() => {
                setCurrentCard(null)
                setLastCardId(null)
                setIsRevealed(false)
              }}
              className="block mx-auto mt-3 text-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            >
              重新开始
            </button>
          )}
        </div>

        {currentCard && (
          <div className="mt-10 card p-6">
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-3">
              当前词典卡片列表
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {studySet.cards.map((card, index) => (
                <div
                  key={card.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    card.id === currentCard.id
                      ? "bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700"
                      : "bg-surface-50 dark:bg-surface-900 hover:bg-surface-100 dark:hover:bg-surface-700"
                  }`}
                >
                  <span className={`text-xs font-medium w-8 shrink-0 ${
                    card.id === currentCard.id
                      ? "text-purple-500"
                      : "text-surface-400 dark:text-surface-500"
                  }`}>
                    #{index + 1}
                  </span>
                  <span className={`text-sm font-medium flex-1 ${
                    card.id === currentCard.id
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-surface-700 dark:text-surface-300"
                  }`}>
                    {card.term}
                  </span>
                  <span className="text-xs text-surface-400 dark:text-surface-500">
                    {card.definition}
                  </span>
                  {card.id === currentCard.id && (
                    <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}