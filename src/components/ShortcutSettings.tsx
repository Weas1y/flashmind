import { useState, useCallback, useEffect, useRef } from "react"
import {
  Keyboard,
  RotateCcw,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import type { ShortcutMap } from "../lib/shortcuts"
import {
  SHORTCUT_ACTIONS,
  loadShortcuts,
  saveShortcuts,
  resetShortcuts,
  findConflict,
  keyToDisplay,
  validKeysForBinding,
} from "../lib/shortcuts"

interface Props {
  visible: boolean
  onClose: () => void
  onShortcutsChanged: (shortcuts: ShortcutMap) => void
}

export default function ShortcutSettings({ visible, onClose, onShortcutsChanged }: Props) {
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(loadShortcuts)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [conflict, setConflict] = useState<{
    actionId: string
    newKey: string
    conflictId: string
  } | null>(null)
  const [savedToast, setSavedToast] = useState(false)
  const recordRef = useRef(false)

  useEffect(() => {
    if (savedToast) {
      const t = setTimeout(() => setSavedToast(false), 2000)
      return () => clearTimeout(t)
    }
  }, [savedToast])

  const handleStartRecording = useCallback((actionId: string) => {
    setRecordingId(actionId)
    setConflict(null)
    recordRef.current = true
  }, [])

  const handleKeyCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!recordRef.current || !recordingId) return

      if (e.key === "Escape") {
        e.preventDefault()
        setRecordingId(null)
        recordRef.current = false
        return
      }

      if (!validKeysForBinding(e.key)) return

      e.preventDefault()
      e.stopPropagation()
      recordRef.current = false

      const newKey = e.key
      const conflictId = findConflict(shortcuts, recordingId, newKey)

      if (conflictId) {
        setConflict({ actionId: recordingId, newKey, conflictId })
      } else {
        applyBinding(recordingId, newKey)
      }
    },
    [recordingId, shortcuts]
  )

  useEffect(() => {
    if (visible) {
      window.addEventListener("keydown", handleKeyCapture, true)
    }
    return () => {
      window.removeEventListener("keydown", handleKeyCapture, true)
    }
  }, [visible, handleKeyCapture])

  const applyBinding = useCallback(
    (actionId: string, newKey: string | null) => {
      setShortcuts((prev) => {
        const next = { ...prev }
        if (conflict) {
          next[conflict.conflictId] = null
        }
        next[actionId] = newKey
        return next
      })
      setRecordingId(null)
      setConflict(null)
    },
    [conflict]
  )

  const handleResolveConflict = useCallback(
    (accepted: boolean) => {
      if (!conflict) return
      if (accepted) {
        applyBinding(conflict.actionId, conflict.newKey)
      } else {
        setRecordingId(null)
        setConflict(null)
      }
    },
    [conflict, applyBinding]
  )

  const handleClearBinding = useCallback((actionId: string) => {
    setShortcuts((prev) => {
      const next = { ...prev }
      next[actionId] = null
      return next
    })
  }, [])

  const handleSave = useCallback(() => {
    saveShortcuts(shortcuts)
    onShortcutsChanged(shortcuts)
    setSavedToast(true)
  }, [shortcuts, onShortcutsChanged])

  const handleResetAll = useCallback(() => {
    const defaults = resetShortcuts()
    setShortcuts(defaults)
    onShortcutsChanged(defaults)
    setSavedToast(true)
  }, [onShortcutsChanged])

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-10 z-50">
      <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-fade-in max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-surface-100 dark:border-surface-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h3 className="font-bold text-surface-800 dark:text-surface-200">快捷键设置</h3>
              <p className="text-xs text-surface-400 dark:text-surface-500">自定义闪卡学习快捷键</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        <div className="p-3 bg-surface-50 dark:bg-surface-750 border-b border-surface-100 dark:border-surface-700 shrink-0">
          <div className="flex items-start gap-2 text-xs text-surface-400 dark:text-surface-500">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-brand-500 shrink-0" />
            <span>点击任一快捷键进入录制模式，按下目标按键完成设置。按 <kbd className="px-1 py-0.5 bg-surface-200 dark:bg-surface-700 rounded text-surface-500">Esc</kbd> 取消录制。</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {conflict && (
            <div className="m-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  快捷键冲突
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  <kbd className="px-1 py-0.5 bg-amber-100 dark:bg-amber-800 rounded text-amber-700 dark:text-amber-400">{keyToDisplay(conflict.newKey)}</kbd>{" "}
                  已被「{SHORTCUT_ACTIONS.find((a) => a.id === conflict.conflictId)?.label}」使用。
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleResolveConflict(true)}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    替换
                  </button>
                  <button
                    onClick={() => handleResolveConflict(false)}
                    className="px-3 py-1.5 text-xs font-medium bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400 rounded-lg hover:bg-surface-300 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {SHORTCUT_ACTIONS.map((action) => {
              const key = shortcuts[action.id]
              const isRecording = recordingId === action.id

              return (
                <div
                  key={action.id}
                  className={`px-5 py-3.5 flex items-center justify-between ${
                    isRecording
                      ? "bg-brand-50 dark:bg-brand-900/20 ring-2 ring-brand-400 ring-inset"
                      : "hover:bg-surface-50 dark:hover:bg-surface-750"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-surface-700 dark:text-surface-300">
                      {action.label}
                    </div>
                    <div className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                      {action.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {key && !isRecording && (
                      <button
                        onClick={() => handleClearBinding(action.id)}
                        className="text-surface-300 dark:text-surface-600 hover:text-red-400 transition-colors"
                        title="清除此快捷键"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleStartRecording(action.id)}
                      className={`min-w-[60px] h-9 px-3 rounded-lg text-sm font-medium border transition-all ${
                        isRecording
                          ? "border-brand-400 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 animate-pulse"
                          : key
                            ? "border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:border-brand-300 dark:hover:border-brand-600"
                            : "border-dashed border-surface-300 dark:border-surface-600 bg-transparent text-surface-400 dark:text-surface-500 hover:border-surface-400"
                      }`}
                    >
                      {isRecording ? (
                        <span className="text-xs">按下按键...</span>
                      ) : key ? (
                        <kbd className="text-xs">{keyToDisplay(key)}</kbd>
                      ) : (
                        <span className="text-xs">未设置</span>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-4 border-t border-surface-100 dark:border-surface-700 flex items-center justify-between shrink-0">
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-surface-500 dark:text-surface-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            恢复默认
          </button>

          <div className="flex items-center gap-3">
            {savedToast && (
              <span className="text-sm text-emerald-500 animate-fade-in">已保存 ✓</span>
            )}
            <button onClick={onClose} className="px-4 py-2 text-sm text-surface-500 hover:text-surface-700 transition-colors">
              取消
            </button>
            <button onClick={handleSave} className="px-5 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
              保存并关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}