export interface FlashCard {
  id: string
  term: string
  definition: string
}

export interface StudySet {
  id: string
  title: string
  description: string
  color: string
  author: string
  userId: string
  cardCount: number
  cards: FlashCard[]
  createdAt: string
  category: string
}

export const defaultCategoryList = [
  "全部",
  "考试英语",
  "日语",
  "法语",
  "理科",
  "文科",
  "考研",
  "编程",
  "医学",
  "艺术",
]
