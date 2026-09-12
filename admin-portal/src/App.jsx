import { Navigate, Route, Routes, Link, useNavigate } from "react-router-dom";
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

function isLoggedIn() {
  return Boolean(localStorage.getItem("adminToken"));
}

function RequireAuth({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  const navigate = useNavigate();
  const name = localStorage.getItem("adminName");

  function logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <nav className="topnav">
        <div className="topnav-brand">Gahoi Parinay Admin</div>
        <div className="topnav-links">
          <Link to="/queue">Queue &amp; Monitoring</Link>
          <Link to="/verified">✅ Verified Profiles</Link>
          <Link to="/outreach">💬 Send Message</Link>
          <Link to="/profiles/new">➕ Create Profile</Link>
          <Link to="/plans">Plans &amp; Offers</Link>
          <Link to="/featured">Highlighted Profiles</Link>
          <Link to="/broadcast">📢 Notifications</Link>
          <Link to="/tickets">Support Tickets</Link>
        </div>
        <div className="topnav-user">
          <span className="muted">{name}</span>
          <button className="secondary" onClick={logout}>
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
        path="/outreach"
        element={
          <RequireAuth>
            <Layout>
              <DirectMessage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/message"
        element={<Navigate to="/outreach" replace />}
      />
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
      <Route
        path="/monitoring"
        element={<Navigate to="/queue" replace />}
      />
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
