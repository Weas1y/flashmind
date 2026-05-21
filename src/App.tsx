import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import Navbar from "./components/Navbar"
import HomePage from "./pages/HomePage"
import StudySetPage from "./pages/StudySetPage"
import StudyMode from "./pages/StudyMode"
import MatchGame from "./pages/MatchGame"
import CreateSet from "./pages/CreateSet"
import ProfilePage from "./pages/ProfilePage"
import LoginPage from "./pages/LoginPage"
import SpellingTest from "./pages/SpellingTest"
import EditSet from "./pages/EditSet"
import RandomCardViewer from "./pages/RandomCardViewer"
import AuthBridge from "./components/AuthBridge"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthBridge />
        <Navbar />
        <main>
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
        </main>
      </AuthProvider>
    </BrowserRouter>
  )
}