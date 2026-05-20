import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function getTodayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getYesterdayDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const STUDY_DATES_KEY = "flashcard_study_dates"
const STUDY_MINUTES_PREFIX = "flashcard_study_minutes_"
const MASTERED_CARDS_KEY = "flashcard_mastered_cards"

export function getDailyStudyMinutes(): number {
  const today = getTodayDate()
  const stored = localStorage.getItem(STUDY_MINUTES_PREFIX + today)
  return stored ? parseInt(stored, 10) : 0
}

export function addStudyMinutes(minutes: number): void {
  const today = getTodayDate()
  const stored = getDailyStudyMinutes()
  localStorage.setItem(STUDY_MINUTES_PREFIX + today, String(stored + minutes))
}

export function recordStudyDay(): void {
  const today = getTodayDate()
  const raw = localStorage.getItem(STUDY_DATES_KEY)
  const dates: string[] = raw ? JSON.parse(raw) : []
  if (!dates.includes(today)) {
    dates.push(today)
    localStorage.setItem(STUDY_DATES_KEY, JSON.stringify(dates))
  }
  cleanupOldStudyData()
}

export function getConsecutiveDays(): number {
  const raw = localStorage.getItem(STUDY_DATES_KEY)
  const dates: string[] = raw ? JSON.parse(raw) : []
  if (dates.length === 0) return 0

  const sorted = [...dates].sort().reverse()
  const today = getTodayDate()
  const yesterday = getYesterdayDate()

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0

  let count = 0
  const checkDate = new Date()

  for (const dateStr of sorted) {
    const target = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`
    if (dateStr === target) {
      count++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (count > 0) {
      break
    }
  }

  return count
}

export function getMasteredCardCount(): number {
  const raw = localStorage.getItem(MASTERED_CARDS_KEY)
  const ids: string[] = raw ? JSON.parse(raw) : []
  return ids.length
}

export function addMasteredCard(cardId: string): void {
  const raw = localStorage.getItem(MASTERED_CARDS_KEY)
  const ids: string[] = raw ? JSON.parse(raw) : []
  if (!ids.includes(cardId)) {
    ids.push(cardId)
    localStorage.setItem(MASTERED_CARDS_KEY, JSON.stringify(ids))
  }
}

export function removeMasteredCard(cardId: string): void {
  const raw = localStorage.getItem(MASTERED_CARDS_KEY)
  const ids: string[] = raw ? JSON.parse(raw) : []
  const filtered = ids.filter((id) => id !== cardId)
  localStorage.setItem(MASTERED_CARDS_KEY, JSON.stringify(filtered))
}

function cleanupOldStudyData(): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STUDY_MINUTES_PREFIX)) {
      const dateStr = key.replace(STUDY_MINUTES_PREFIX, "")
      if (dateStr < getYesterdayDate()) {
        keysToRemove.push(key)
      }
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}