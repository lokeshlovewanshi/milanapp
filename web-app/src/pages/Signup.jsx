import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authAPI, otpAPI, setToken } from "../api";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
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
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);
    try {
      // This only sends the confirmation code. No account exists until the
      // code is successfully redeemed in handleVerifyOtp below.
      await otpAPI.request(email.trim(), "SIGNUP");
      setOtpSent(true);
      setOtpCode("");
    } catch (err) {
      setError(err.message || "Could not send the verification code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (otpCode.trim().length !== 4) {
      setError("Enter the 4-digit code sent to your email");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await authAPI.signupAfterOtp({
        name: name.trim(),
        email: email.trim(),
        mobileNo: mobileNo.trim(),
        password,
        code: otpCode.trim(),
      });
      setToken(res.token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Could not verify the code or create your account");
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
      <form className="auth-form" onSubmit={otpSent ? handleVerifyOtp : handleSubmit}>
        <div id="google-signin-btn" className="google-btn-wrap" />

        <div className="auth-divider">OR</div>

        {!otpSent ? <div className="auth-fields-stack">
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

          <label>
            <span>Confirm Password</span>
            <div className="input-field-wrap">
              <span className="input-field-icon">
                <Icon name="lock" size={17} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
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
              {loading ? "Sending code..." : "Continue / आगे बढ़ें"}
            </span>
          </button>
        </div> : <div className="auth-fields-stack">
          <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Enter the 4-digit verification code sent to <strong>{email}</strong>.
            Your account will be created only after the code is verified.
          </p>

          <label>
            <span>Email Verification Code</span>
            <div className="input-field-wrap">
              <span className="input-field-icon">
                <Icon name="mail" size={17} />
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                required
                maxLength={4}
                placeholder="Enter 4-digit code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
          </label>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "0.5rem" }}>
            <Icon name="user" size={16} />
            <span>{loading ? "Creating account..." : "Verify & Create Account"}</span>
          </button>

          <button
            type="button"
            className="auth-link-button"
            disabled={loading}
            onClick={() => {
              setOtpSent(false);
              setOtpCode("");
              setError("");
            }}
          >
            Change details
          </button>
        </div>}

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
