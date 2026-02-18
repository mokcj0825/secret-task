import { BrowserRouter, NavLink, Routes, Route, Navigate } from 'react-router-dom'
import Prepare from './pages/Prepare'
import Attempt from './pages/Attempt'
import './App.css'

function Layout() {
  return (
    <div className="app">
      <nav className="nav">
        <NavLink to="/prepare" className={({ isActive }) => (isActive ? 'active' : '')}>Prepare (Admin)</NavLink>
        <NavLink to="/attempt" className={({ isActive }) => (isActive ? 'active' : '')}>Attempt (Practice)</NavLink>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/prepare" element={<Prepare />} />
          <Route path="/attempt" element={<Attempt />} />
          <Route path="/" element={<Navigate to="/prepare" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}

export default App
