import { useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  NavLink,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Login from "./pages/Login";
import Queue from "./pages/Queue";
import ProfileDetail from "./pages/ProfileDetail";
import Featured from "./pages/Featured";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import Plans from "./pages/Plans";
import BroadcastNotifications from "./pages/BroadcastNotifications";
import CreateProfile from "./pages/CreateProfile";
import DirectMessage from "./pages/DirectMessage";
import VerifiedProfiles from "./pages/VerifiedProfiles";
import DeletedProfiles from "./pages/DeletedProfiles";

function isLoggedIn() {
  return Boolean(localStorage.getItem("adminToken"));
}

function RequireAuth({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const name = localStorage.getItem("adminName");
  const [mobileOpen, setMobileOpen] = useState(false);

  function logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    navigate("/login");
  }

  const closeMenu = () => setMobileOpen(false);

  return (
    <div className="app-shell">
      {mobileOpen && <div className="mobile-backdrop" onClick={closeMenu} />}

      <nav className="topnav">
        <div className="topnav-header">
          <Link to="/queue" className="topnav-brand" onClick={closeMenu}>
            👑 Lovewanshi Parinay Admin
          </Link>
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        <div className={`topnav-links ${mobileOpen ? "open" : ""}`}>
          <NavLink
            to="/queue"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            📊 Queue &amp; Monitoring
          </NavLink>
          <NavLink
            to="/verified"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            ✅ Verified Profiles
          </NavLink>
          <NavLink
            to="/deleted"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Deleted Accounts
          </NavLink>
          <NavLink
            to="/outreach"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            💬 Send Message
          </NavLink>
          <NavLink
            to="/profiles/new"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            ➕ Create Profile
          </NavLink>
          {/* Plans & Offers navigation intentionally hidden until membership plans are re-enabled. */}
          <NavLink
            to="/featured"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            ⭐ Highlighted
          </NavLink>
          <NavLink
            to="/broadcast"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            📢 Notifications
          </NavLink>
          <NavLink
            to="/tickets"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            🎫 Support Tickets
          </NavLink>

          <div className="topnav-mobile-user">
            {name && <span className="muted small">👤 {name}</span>}
            <button className="secondary small" onClick={logout}>
              Log out
            </button>
          </div>
        </div>

        <div className="topnav-user desktop-only">
          {name && <span className="muted small">👤 {name}</span>}
          <button className="secondary small" onClick={logout}>
            Log out
          </button>
        </div>
      </nav>

      <main className="content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn() ? <Navigate to="/queue" replace /> : <Login />}
      />
      <Route
        path="/queue"
        element={
          <RequireAuth>
            <Layout>
              <Queue />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/verified"
        element={
          <RequireAuth>
            <Layout>
              <VerifiedProfiles />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/deleted"
        element={
          <RequireAuth>
            <Layout>
              <DeletedProfiles />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/outreach"
        element={
          <RequireAuth>
            <Layout>
              <DirectMessage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route path="/message" element={<Navigate to="/outreach" replace />} />
      <Route
        path="/plans"
        element={
          <RequireAuth>
            <Layout>
              <Plans />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/broadcast"
        element={
          <RequireAuth>
            <Layout>
              <BroadcastNotifications />
            </Layout>
          </RequireAuth>
        }
      />
      <Route path="/monitoring" element={<Navigate to="/queue" replace />} />
      <Route
        path="/profiles/new"
        element={
          <RequireAuth>
            <Layout>
              <CreateProfile />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/profiles/:id"
        element={
          <RequireAuth>
            <Layout>
              <ProfileDetail />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/featured"
        element={
          <RequireAuth>
            <Layout>
              <Featured />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/tickets"
        element={
          <RequireAuth>
            <Layout>
              <Tickets />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <RequireAuth>
            <Layout>
              <TicketDetail />
            </Layout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/queue" replace />} />
    </Routes>
  );
}
