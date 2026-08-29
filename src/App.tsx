import { Routes, Route } from 'react-router-dom'
import { DiaryChatProvider } from './context/DiaryChatContext'
import HomeLayout from './components/HomeLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import MainMenu from './pages/MainMenu'
import DiaryPages from './pages/DiaryPages'
import PageView from './pages/PageView'
import NotFound from './pages/NotFound'

function App() {
  return (
    <DiaryChatProvider>
      <Routes>
        {/* Home — hero, no navbar */}
        <Route path="/" element={<HomeLayout />}>
          <Route index element={<Home />} />
        </Route>

        {/* Auth — standalone full-screen pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* App */}
        <Route path="/diary" element={<MainMenu />} />
        <Route path="/diary/:id/pages" element={<DiaryPages />} />
        <Route path="/diary/:id/pages/:pageId" element={<PageView />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </DiaryChatProvider>
  )
}

export default App
