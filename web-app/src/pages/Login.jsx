import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authAPI, setToken } from "../api";
import { useGoogleButton } from "../useGoogleButton";
import AuthHero from "../components/AuthHero";
import { Icon } from "../components/Icons";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/browse";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleToken(idToken) {
    setError("");
    try {
      const res = await authAPI.googleAuth(idToken);
      setToken(res.token);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.status === 410) {
        if (window.confirm("This account was deleted. Restore it and sign in?")) {
          try {
            const res = await authAPI.restoreGoogle(idToken);
            setToken(res.token);
            navigate(from, { replace: true });
          } catch {
            setError("Could not restore this account");
          }
        }
        return;
      }
      setError("Google sign-in failed. Please try again.");
    }
  }

  useGoogleButton("google-signin-btn", handleGoogleToken);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError("");
    setLoading(true);
    try {
      const res = await authAPI.login(email.trim(), password);
      setToken(res.token);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.status === 410) {
        if (window.confirm("This account was deleted. Restore it and sign in?")) {
          try {
            const res = await authAPI.restore(email.trim(), password);
            setToken(res.token);
            navigate(from, { replace: true });
          } catch {
            setError("Could not restore this account - check your password");
          }
        }
      } else {
        setError(err.message || "Incorrect email or password");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthHero
      title="Welcome Back"
      subtitle="Sign in to continue your journey"
      tagline={["Find the one who", "completes your story."]}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div id="google-signin-btn" className="google-btn-wrap" />

        <div className="auth-divider">OR</div>

        <div className="auth-fields-stack">
          <label>
            <span>Email</span>
            <div className="input-field-wrap">
              <span className="input-field-icon">
                <Icon name="mail" size={17} />
              </span>
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="input-field-wrap">
              <span className="input-field-icon">
                <Icon name="lock" size={17} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((s) => !s)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={16} />
              </button>
            </div>
          </label>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "0.5rem" }}>
            <Icon name="lock" size={16} />
            <span>{loading ? "Signing in..." : "Login"}</span>
          </button>
        </div>

        <p className="auth-switch-text">
          Don't have an account? <Link to="/signup" state={{ from }}>Create an Account</Link>
        </p>

        <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "1rem" }}>
          By continuing, you agree to our <Link to="/privacy" style={{ color: "var(--auth-crimson)", textDecoration: "underline" }}>Privacy Policy</Link>
        </p>
      </form>
    </AuthHero>
  );
}
