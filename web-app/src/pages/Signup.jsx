import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authAPI, setToken } from "../api";
import { useGoogleButton } from "../useGoogleButton";
import AuthHero from "../components/AuthHero";
import { Icon } from "../components/Icons";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/browse";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
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
    } catch {
      setError("Google sign-in failed");
    }
  }

  useGoogleButton("google-signin-btn", handleGoogleToken);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    setError("");
    setLoading(true);
    try {
      const res = await authAPI.signup({
        name: name.trim(),
        email: email.trim(),
        mobileNo: mobileNo.trim(),
        password,
      });
      setToken(res.token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Could not create your account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthHero
      title="Create Account"
      subtitle="Find your perfect match with Lodha Parinay"
      tagline={["Find the one who", "completes your story."]}
      backTo="/login"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div id="google-signin-btn" className="google-btn-wrap" />

        <div className="auth-divider">OR</div>

        <div className="auth-fields-stack">
          <label>
            <span>Full Name</span>
            <div className="input-field-wrap">
              <span className="input-field-icon">
                <Icon name="user" size={17} />
              </span>
              <input
                required
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          </label>

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
            <span>Mobile Number</span>
            <div className="input-field-wrap">
              <span className="input-field-icon">
                <Icon name="phone" size={17} />
              </span>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
                autoComplete="tel"
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
                minLength={6}
                placeholder="Create a secure password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: "0.5rem" }}
          >
            <Icon name="user" size={16} />
            <span>
              {loading ? "Creating account..." : "Sign Up / खाता बनाएं"}
            </span>
          </button>
        </div>

        <p className="auth-switch-text">
          Already have an account?{" "}
          <Link to="/login" state={{ from }}>
            Log in
          </Link>
        </p>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            marginTop: "1rem",
          }}
        >
          By creating an account, you agree to our{" "}
          <Link
            to="/privacy"
            style={{
              color: "var(--auth-crimson)",
              textDecoration: "underline",
            }}
          >
            Privacy Policy
          </Link>
        </p>
      </form>
    </AuthHero>
  );
}
