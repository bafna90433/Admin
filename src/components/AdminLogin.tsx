import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // ✅ Changed: Import axios directly
import "../styles/AdminLogin.css";

// --- ✅ CONFIGURATION (Live URL Fix) ---
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!username.trim() || !password.trim()) {
      setErr("Please enter username and password");
      return;
    }

    try {
      setLoading(true);
      // ✅ Changed: Using axios with API_BASE
      const { data } = await axios.post(`${API_BASE}/admin/login`, {
        username: username.trim(),
        password: password.trim(),
      });

      if (!data?.token) {
        throw new Error("Invalid response from server");
      }

      // ✅ Token save
      localStorage.setItem("adminToken", data.token);

      // ✅ Redirect admin dashboard
      navigate("/admin");
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Login failed. Please try again.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-glass">
        <div className="admin-login-header">
          <h1>Welcome Back</h1>
          <p>Enter your credentials to access the admin panel</p>
        </div>

        <form className="admin-login-form" onSubmit={onSubmit}>
          {/* Username */}
          <div className="input-group">
            <input
              type="text"
              name="username"
              placeholder=" "
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label>Username</label>
            <span className="input-highlight"></span>
          </div>

          {/* Password */}
          <div className="input-group">
            <input
              type={showPass ? "text" : "password"}
              name="password"
              placeholder=" "
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label>Password</label>
            <span className="input-highlight"></span>
            <button
              type="button"
              className="toggle-pass"
              onClick={() => setShowPass((s) => !s)}
              aria-label="Toggle password visibility"
            >
              {showPass ? <EyeIcon visible /> : <EyeIcon visible={false} />}
            </button>
          </div>

          {/* Error */}
          {err && <div className="error-message">{err}</div>}

          {/* Submit */}
          <button className="login-button" type="submit" disabled={loading}>
            {loading ? (
              <LoadingSpinner />
            ) : (
              <>
                Login
                <ArrowIcon />
              </>
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>
            Having trouble? <a href="/support">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

// Icons
const EyeIcon = ({ visible }: { visible: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <path
          d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
          fill="currentColor"
        />
        <path
          d="M22 12C22 12 18 18 12 18C6 18 2 12 2 12C2 12 6 6 12 6C18 6 22 12 22 12Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <>
        <path
          d="M14.12 14.12C13.8454 14.4147 13.5141 14.6512 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1752 15.0074 10.8016 14.8565C10.4281 14.7056 10.0887 14.481 9.80385 14.1962C9.51897 13.9113 9.29439 13.5719 9.14351 13.1984C8.99262 12.8248 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2218 9.18488 10.8538C9.34884 10.4859 9.58525 10.1546 9.88 9.88M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C6 20 2 12 2 12C3.908 8.504 6.824 6.048 9.86 4.96M22 12C22 12 20.092 15.496 17.94 17.94M9.88 9.88C10.725 9.135 11.828 8.75 12.965 8.75C14.102 8.75 15.205 9.135 16.05 9.88M9.88 9.88L2 2M17.94 17.94L22 22M16.05 9.88L20.12 5.88M16.05 9.88L12.54 13.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )}
  </svg>
);

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12H19M19 12L12 5M19 12L12 19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="spinner" viewBox="0 0 50 50">
    <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
  </svg>
);

export default AdminLogin;