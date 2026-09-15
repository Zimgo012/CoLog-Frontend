import { Routes, Route } from 'react-router-dom'
import { DiarySessionProvider } from './context/DiarySessionContext'
import HomeLayout from './components/HomeLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import MainMenu from './pages/DiaryList.tsx'
import DiaryPages from './pages/DiaryPages'
import DocumentView from './pages/DocumentView.tsx'
import NotFound from './pages/NotFound'
import { AuthProvider } from "./auth/AuthContext.tsx";
import ProtectedRoute from "./auth/ProtectedRoute.tsx";
import SessionExpiredModal from "./components/SessionExpiredModal.tsx";
import { NotificationProvider } from "./context/NotificationContext.tsx";
import { ThemeProvider, useTheme } from "./context/ThemeContext.tsx";

function ThemedApp() {
  const { theme } = useTheme()
  return <div data-theme={theme} className="min-h-screen bg-base-200 text-base-content">
    <SessionExpiredModal />
    <Routes>
      {/* Home — hero, no navbar */}
      <Route path="/" element={<HomeLayout />}>
        <Route index element={<Home />} />
      </Route>

      {/* Auth — standalone full-screen pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/diary" element={<MainMenu />} />
        <Route path="/diary/:id/pages" element={<DiaryPages />} />
        <Route path="/diary/:id/pages/:pageId" element={<DocumentView />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </div>
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <DiarySessionProvider>
            <ThemedApp />
          </DiarySessionProvider>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
