import { BrowserRouter, Routes, Route } from "react-router-dom"
import { lazy, Suspense } from "react"
import { AuthProvider } from "./contexts/AuthContext"
import Navbar from "./components/Navbar"
import AuthBridge from "./components/AuthBridge"
import ErrorBoundary from "./components/ErrorBoundary"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"

const StudySetPage = lazy(() => import("./pages/StudySetPage"))
const StudyMode = lazy(() => import("./pages/StudyMode"))
const MatchGame = lazy(() => import("./pages/MatchGame"))
const CreateSet = lazy(() => import("./pages/CreateSet"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const SpellingTest = lazy(() => import("./pages/SpellingTest"))
const EditSet = lazy(() => import("./pages/EditSet"))
const RandomCardViewer = lazy(() => import("./pages/RandomCardViewer"))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-surface-400 dark:text-surface-500">加载中...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthBridge />
        <Navbar />
        <main>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/set/:id" element={<StudySetPage />} />
                <Route path="/set/:id/study" element={<StudyMode />} />
                <Route path="/set/:id/match" element={<MatchGame />} />
                <Route path="/set/:id/spell" element={<SpellingTest />} />
                <Route path="/set/:id/edit" element={<EditSet />} />
                <Route path="/set/:id/random" element={<RandomCardViewer />} />
                <Route path="/create" element={<CreateSet />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </AuthProvider>
    </BrowserRouter>
  )
}
