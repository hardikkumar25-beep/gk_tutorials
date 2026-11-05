import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GraduationCap, LockKeyhole } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch {
      setError("Login failed. Check the email and password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <Link to="/" className="back-link">← Back to website</Link>
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-icon"><GraduationCap size={28} /></div>
        <span className="eyebrow">G.K. TUTORIALS</span>
        <h1>Admin login</h1>
        <p>Sign in to manage the institute.</p>
        <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button button-primary login-submit" disabled={busy}>{busy ? "Signing in..." : <><LockKeyhole size={16} /> Sign in</>}</button>
      </form>
    </main>
  );
}
