import { Routes, Route } from 'react-router-dom'
import HomeLayout from './components/HomeLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import MainMenu from './pages/MainMenu'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      {/* Home — hero, no navbar */}
      <Route path="/" element={<HomeLayout />}>
        <Route index element={<Home />} />
      </Route>

      {/* Auth — standalone full-screen pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* App */}
      <Route path="/menu" element={<MainMenu />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
