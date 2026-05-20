import { useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useStore } from "../store/useStore"

export default function AuthBridge() {
  const { user, isAuthenticated } = useAuth()
  const { loadUserStudySets, clearUserStudySets, currentUserId } = useStore()

  useEffect(() => {
    if (isAuthenticated && user && user.id !== currentUserId) {
      loadUserStudySets(user.id)
    } else if (!isAuthenticated && currentUserId) {
      clearUserStudySets()
    }
  }, [isAuthenticated, user, currentUserId, loadUserStudySets, clearUserStudySets])

  return null
}