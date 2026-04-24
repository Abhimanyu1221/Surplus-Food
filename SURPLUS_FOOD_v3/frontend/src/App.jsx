import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom'
import FoodList from './pages/FoodList'
import HotelDashboard from './pages/HotelDashboard'
import NgoDashboard from './pages/NgoDashboard'
import VolunteerDashboard from './pages/VolunteerDashboard'
import MapView from './pages/MapView'
import Login from './pages/Login'
import Register from './pages/Register'
import { useAuth } from './context/AuthContext'
import './index.css'

/**
 * Navigation — sticky glassmorphism bar with role-aware links,
 * avatar initials, and smooth hover transitions.
 */
function Navigation() {
  const { user, logout } = useAuth();

  // Get initials from name for the avatar bubble
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="navbar">
      <div className="container">
        {/* Brand logo */}
        <Link to="/" className="nav-logo">
          <span className="nav-logo-icon">🍱</span>
          SurplusFood Pune
        </Link>

        {/* Nav links */}
        <nav className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            Browse Food
          </NavLink>

          <NavLink
            to="/map"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            Live Map
          </NavLink>

          {user?.role === 'hotel' && (
            <NavLink to="/hotel" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Hotel Dashboard
            </NavLink>
          )}

          {user?.role === 'ngo' && (
            <NavLink to="/ngo" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              NGO Dashboard
            </NavLink>
          )}

          {user?.role === 'volunteer' && (
            <NavLink to="/volunteer" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Volunteer Dashboard
            </NavLink>
          )}

          {user ? (
            <div className="nav-user-info">
              {/* Avatar bubble */}
              <div className="nav-avatar">{initials}</div>
              <div>
                <div className="nav-user-name">{user.name}</div>
                <div className="nav-user-role">{user.role}</div>
              </div>
              <button
                onClick={logout}
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: '0.25rem' }}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Login / Register
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <div className="app-layout">
        <Navigation />

        <main className="main-content">
          <Routes>
            <Route path="/"         element={<FoodList />} />
            <Route path="/map"      element={<MapView />} />
            <Route path="/hotel"    element={<HotelDashboard />} />
            <Route path="/ngo"      element={<NgoDashboard />} />
            <Route path="/volunteer" element={<VolunteerDashboard />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>

        <footer className="footer">
          <span className="footer-brand">SurplusFood Pune</span>
          — Turning waste into nourishment · Built with ❤️ for Pune &copy; 2026
        </footer>
      </div>
    </Router>
  );
}

export default App
