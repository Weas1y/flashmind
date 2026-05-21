export interface ShortcutAction {
  id: string
  label: string
  description: string
}

export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  { id: "flip", label: "翻转卡片", description: "翻开/合上当前卡片查看释义" },
  { id: "next", label: "下一张（标记已掌握）", description: "标记当前卡片为已掌握并切换到下一张" },
  { id: "previous", label: "上一张（标记不熟悉）", description: "标记当前卡片为不熟悉并切换到上一张" },
  { id: "markKnown", label: "仅标记已掌握", description: "仅标记当前卡片为已掌握，不自动切换" },
  { id: "markUnknown", label: "仅标记不熟悉", description: "仅标记当前卡片为不熟悉，不自动切换" },
  { id: "undo", label: "撤回", description: "撤销上一次标记操作" },
  { id: "reset", label: "重置学习", description: "重置所有学习进度和标记状态" },
  { id: "speak", label: "朗读发音", description: "朗读当前卡片的单词发音" },
  { id: "focusMode", label: "重点学习模式", description: "进入或退出重点学习模式" },
  { id: "toggleSettings", label: "打开/关闭设置", description: "展开或收起学习设置面板" },
]

export interface ShortcutMap {
  [actionId: string]: string | null
}

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  flip: " ",
  next: "ArrowRight",
  previous: null,
  markKnown: "h",
  markUnknown: "ArrowLeft",
  undo: "z",
  reset: "r",
  speak: null,
  focusMode: null,
  toggleSettings: null,
}

const STORAGE_KEY = "flashcard_shortcuts"

export function loadShortcuts(): ShortcutMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SHORTCUTS }
    const parsed = JSON.parse(raw) as Partial<ShortcutMap>
    const merged: ShortcutMap = { ...DEFAULT_SHORTCUTS }
    for (const key of Object.keys(merged)) {
      if (key in parsed) {
        merged[key] = parsed[key]
      }
    }
    return merged
  } catch {
    return { ...DEFAULT_SHORTCUTS }
  }
}

export function saveShortcuts(shortcuts: ShortcutMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts))
  } catch { /* quota exceeded */ }
}

export function resetShortcuts(): ShortcutMap {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
  return { ...DEFAULT_SHORTCUTS }
}

export function findConflict(
  shortcuts: ShortcutMap,
  actionId: string,
  newKey: string | null
): string | null {
  if (!newKey) return null
  for (const [id, key] of Object.entries(shortcuts)) {
    if (id !== actionId && key === newKey) {
      return id
    }
  }
  return null
}

export function keyToDisplay(key: string): string {
  const displayMap: Record<string, string> = {
    " ": "空格",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Escape: "Esc",
    Enter: "回车",
    Tab: "Tab",
    Backspace: "退格",
    Delete: "Delete",
    Home: "Home",
    End: "End",
    PageUp: "PgUp",
    PageDown: "PgDn",
    Control: "Ctrl",
    Shift: "Shift",
    Alt: "Alt",
    Meta: "Win",
    CapsLock: "大写",
    Insert: "Ins",
  }
  if (displayMap[key]) return displayMap[key]
  if (key.length === 1) return key.toUpperCase()
  return key
}

export function validKeysForBinding(key: string): boolean {
  if (!key || key.length === 0) return false
  if (key === "Control" || key === "Shift" || key === "Alt" || key === "Meta") return false
  if (key === "CapsLock" || key === "NumLock" || key === "ScrollLock") return false
  if (key === "Tab") return false
  if (key === "Escape") return true
  if (key === "Enter") return true
  if (key === "Backspace") return true
  if (key === "Delete") return true
  if (key.startsWith("Arrow")) return true
  if (key.startsWith("F") && /^F\d{1,2}$/.test(key)) return true
  if (key === " ") return true
  if (key.length === 1) return true
  return false
}