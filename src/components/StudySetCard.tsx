import { useState } from "react"
import { Link } from "react-router-dom"
import { BookOpen, ChevronRight, Trash2, AlertTriangle } from "lucide-react"
import type { StudySet } from "../data/mockData"

interface StudySetCardProps {
  set: StudySet
  onDelete?: (id: string) => void
  onConfirmDelete?: (id: string) => void
}

export default function StudySetCard({ set, onConfirmDelete }: StudySetCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (deleting) return
    setDeleting(true)
    try {
      onConfirmDelete?.(set.id)
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }

  const handleShowConfirm = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  if (showDeleteConfirm) {
    return (
      <div className="card overflow-hidden animate-float-up relative">
        <div className="h-32 sm:h-36" style={{ backgroundColor: set.color }}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10 pointer-events-none" />
        </div>
        <div className="p-4 flex flex-col items-center justify-center gap-3 min-h-[120px]">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-sm font-medium text-surface-700 text-center">
            确定要删除<br />"{set.title}" 吗？
          </p>
          <p className="text-xs text-surface-400">30秒内可撤销</p>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {deleting ? "删除中..." : "删除"}
            </button>
            <button
              type="button"
              onClick={handleCancelDelete}
              className="px-4 py-1.5 bg-surface-100 text-surface-600 text-sm font-medium rounded-lg hover:bg-surface-200 transition-colors cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group animate-float-up">
      <Link to={`/set/${set.id}`} className="card block overflow-hidden">
        <div
          className="h-32 sm:h-36 relative overflow-hidden"
          style={{ backgroundColor: set.color }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10 pointer-events-none" />
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
              {set.category}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 opacity-80 pointer-events-none">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-surface-800 text-sm sm:text-base line-clamp-1 group-hover:text-brand-500 transition-colors">
            {set.title}
          </h3>
          <p className="text-xs text-surface-400 mt-1 line-clamp-1">{set.description}</p>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-50">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-surface-100 flex items-center justify-center text-xs font-medium text-surface-500">
                {set.author[0]}
              </div>
              <span className="text-xs text-surface-400">{set.author}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-surface-400">
              <BookOpen className="w-3 h-3" />
              {set.cardCount} 张卡片
            </div>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={handleShowConfirm}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 hover:bg-red-50 text-surface-400 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm z-20 pointer-events-auto cursor-pointer"
        title="删除学习集"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function FeaturedSetCard({ set, onConfirmDelete }: StudySetCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (deleting) return
    setDeleting(true)
    try {
      onConfirmDelete?.(set.id)
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }

  const handleShowConfirm = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  if (showDeleteConfirm) {
    return (
      <div className="relative rounded-2xl overflow-hidden animate-float-up" style={{ backgroundColor: set.color }}>
        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent pointer-events-none" />
        <div className="p-6 sm:p-8 min-h-[200px] flex flex-col items-center justify-center gap-3 relative">
          <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <p className="text-white text-lg font-medium text-center">
            确定要删除 "{set.title}" 吗？
          </p>
          <p className="text-white/60 text-sm">30秒内可撤销</p>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-5 py-2 bg-white text-red-500 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {deleting ? "删除中..." : "删除"}
            </button>
            <button
              type="button"
              onClick={handleCancelDelete}
              className="px-5 py-2 bg-white/20 text-white text-sm font-medium rounded-lg hover:bg-white/30 transition-colors cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group">
      <Link to={`/set/${set.id}`} className="block">
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ backgroundColor: set.color }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-black/30 to-transparent pointer-events-none" />
          <div className="p-6 sm:p-8 min-h-[200px] flex flex-col justify-end relative">
            <span className="text-white/70 text-xs font-medium mb-2">{set.category}</span>
            <h3 className="text-white text-xl sm:text-2xl font-bold font-display mb-1 group-hover:translate-x-1 transition-transform">
              {set.title}
            </h3>
            <p className="text-white/70 text-sm line-clamp-1 mb-3">{set.description}</p>
            <div className="flex items-center gap-3 text-white/60 text-xs">
              <span>{set.cardCount} 张卡片</span>
              <span>·</span>
              <span>{set.author}</span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-white text-sm font-medium">
              <span>开始学习</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={handleShowConfirm}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto cursor-pointer"
        title="删除学习集"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}