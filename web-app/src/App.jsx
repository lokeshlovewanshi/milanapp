import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { isLoggedIn, clearSession, notificationAPI, profileAPI } from "./api";
import { Icon } from "./components/Icons";
import AvatarFallback from "./components/AvatarFallback";
import logoImg from "./assets/logo.png";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Browse from "./pages/Browse";
import ProfileDetail from "./pages/ProfileDetail";
import Likes from "./pages/Likes";
import Shortlist from "./pages/Shortlist";
import Kundali from "./pages/Kundali";
import Notifications from "./pages/Notifications";
import MyProfile from "./pages/MyProfile";
import Support from "./pages/Support";
import TicketDetail from "./pages/TicketDetail";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DeleteAccount from "./pages/DeleteAccount";

function RequireAuth({ children }) {
  const location = useLocation();
  return isLoggedIn() ? (
    children
  ) : (
    <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  );
}

import SeoFooter from "./components/SeoFooter";

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    
    // Fetch unread count
    notificationAPI
      .unreadCount()
      .then((res) => setUnreadCount(Number(res?.count || 0)))
      .catch(() => {});

    // Fetch own profile for avatar
    profileAPI
      .getMe()
      .then(setMe)
      .catch(() => {});
  }, [location.pathname]);

  function logout() {
    clearSession();
    navigate("/login");
  }

  const avatarUrl = me?.profileImageFull || me?.profileImage || me?.imageUrl;
  const myName = me?.name || "My Profile";
  const myFirstName = myName.split(" ")[0];
  const rawId = String(me?.id || "");
  const digits = rawId.replace(/\D/g, "");
  const myCode = digits ? `GM${digits.padStart(5, "0")}` : (rawId ? `GM${rawId}` : "");

  return (
    <div className="matrimony-app-shell">
      {/* World-Class Matrimonial Desktop Top Navigation Bar */}
      <header className="matrimony-navbar">
        <div className="navbar-container">
          {/* Brand Logo & Wordmark */}
          <Link to="/browse" className="navbar-brand">
            <img src={logoImg} alt="Gahoi Parinay" className="navbar-logo-img" />
            <div className="navbar-brand-text">
              <span className="navbar-brand-title">Gahoi Parinay</span>
            </div>
          </Link>

          {/* Desktop Primary Nav Links */}
          <nav className="navbar-links desktop-only">
            <NavLink to="/browse" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <span>Matches</span>
            </NavLink>
            <NavLink to="/likes" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <span>Interests</span>
            </NavLink>
            <NavLink to="/shortlist" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <span>Shortlist</span>
            </NavLink>
            <NavLink to="/kundali" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <span>Kundali Milan</span>
            </NavLink>
            <NavLink to="/support" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <span>Support</span>
            </NavLink>
          </nav>

          {/* User Controls (Right) */}
          <div className="navbar-user-actions">
            {/* Notifications Bell */}
            <NavLink to="/notifications" className="navbar-bell-btn" title="Notifications">
              <Icon name="bell" size={20} />
              {unreadCount > 0 && (
                <span className="navbar-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </NavLink>

            {/* Profile Dropdown / Pill */}
            <Link to="/me" className="navbar-profile-pill" title="View & Edit My Profile">
              <div className="navbar-avatar-ring">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={myName} />
                ) : (
                  <AvatarFallback name={myName} size={28} glyphSize={11} />
                )}
              </div>
              <div className="navbar-profile-info desktop-only">
                <span className="navbar-profile-name">{myFirstName}</span>
                {myCode && <span className="navbar-profile-code">{myCode}</span>}
              </div>
              <Icon name="chevron-down" size={13} color="#6B7280" className="desktop-only" />
            </Link>

            {/* Log out */}
            <button type="button" className="navbar-logout-btn desktop-only" onClick={logout} title="Log out">
              <Icon name="log-out" size={15} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="matrimony-main-content">
        <div className="matrimony-main-container">{children}</div>
        <SeoFooter />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="matrimony-mobile-bottom-nav mobile-only">
        <NavLink to="/browse" className={({ isActive }) => `mobile-tab ${isActive ? "active" : ""}`}>
          <Icon name="search" size={20} />
          <span>Matches</span>
        </NavLink>
        <NavLink to="/likes" className={({ isActive }) => `mobile-tab ${isActive ? "active" : ""}`}>
          <Icon name="heart" size={20} />
          <span>Interests</span>
        </NavLink>
        <NavLink to="/shortlist" className={({ isActive }) => `mobile-tab ${isActive ? "active" : ""}`}>
          <Icon name="bookmark" size={20} />
          <span>Shortlist</span>
        </NavLink>
        <NavLink to="/me" className={({ isActive }) => `mobile-tab ${isActive ? "active" : ""}`}>
          <Icon name="user" size={20} />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}

function withLayout(Page) {
  return (
    <RequireAuth>
      <Layout>
        <Page />
      </Layout>
    </RequireAuth>
  );
}

function withPublicLayout(Page) {
  return (
    <Layout>
      <Page />
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={isLoggedIn() ? <Navigate to="/browse" replace /> : <Login />} />
      <Route path="/signup" element={isLoggedIn() ? <Navigate to="/browse" replace /> : <Signup />} />

      <Route path="/browse" element={withLayout(Browse)} />
      <Route path="/profile/:id" element={withPublicLayout(ProfileDetail)} />
      <Route path="/profiles/:id" element={withPublicLayout(ProfileDetail)} />
      <Route path="/likes" element={withLayout(Likes)} />
      <Route path="/shortlist" element={withLayout(Shortlist)} />
      <Route path="/kundali" element={withLayout(Kundali)} />
      <Route path="/notifications" element={withLayout(Notifications)} />
      <Route path="/me" element={withLayout(MyProfile)} />
      <Route path="/support" element={withLayout(Support)} />
      <Route path="/support/:id" element={withLayout(TicketDetail)} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/delete-account" element={<DeleteAccount />} />
      <Route path="/delete" element={<DeleteAccount />} />

      <Route path="*" element={<Navigate to={isLoggedIn() ? "/browse" : "/login"} replace />} />
    </Routes>
  );
}
