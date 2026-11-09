import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  Radio,
  Save,
  RefreshCw,
  ExternalLink,
  LogOut,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function OnlineClass() {
  const { logout } = useAuth();

  const [form, setForm] = useState({
    title: "",
    url: "",
    is_published: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    loadOnlineClass();
  }, []);

  const loadOnlineClass = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/online-class");

      if (response.data) {
        setForm({
          title: response.data.title || "",
          url: response.data.url || "",
          is_published: response.data.is_published || false,
        });

        setUpdatedAt(response.data.updated_at);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load online class settings."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put("/online-class", {
        title: form.title.trim(),
        url: form.url.trim(),
        is_published: form.is_published,
      });

      setForm({
        title: response.data.title,
        url: response.data.url,
        is_published: response.data.is_published,
      });

      setUpdatedAt(response.data.updated_at);
      setSuccess("Online class settings saved successfully.");
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        Array.isArray(detail)
          ? detail.map((item) => item.msg).join(", ")
          : detail || "Unable to save online class settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const navItems = [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "Students", path: "/admin/students", icon: Users },
    { label: "Teachers", path: "/admin/teachers", icon: GraduationCap },
    { label: "Batches", path: "/admin/batches", icon: Layers },
    { label: "Online Classes", path: "/admin/online-class", icon: Radio },
  ];

  if (loading) {
    return (
      <div className="admin-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <h2>G.K. Tutorials</h2>
            <p>Administration</p>
          </div>
        </aside>

        <main className="admin-main">
          <div className="dashboard-content">
            <p>Loading online class settings...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>G.K. Tutorials</h2>
          <p>Administration</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`side-link ${
                  item.path === "/admin/online-class" ? "active" : ""
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button className="side-link logout-link" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h2>Online Classes</h2>
            <p>Manage the current YouTube livestream</p>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="page-heading">
            <div>
              <h1>Online Class Management</h1>
              <p>
                Update the YouTube link whenever a new class is scheduled.
              </p>
            </div>
          </div>

          <div className="admin-card">
            <div className="section-heading">
              <div>
                <h3>Current Livestream</h3>
                <p>
                  The public website will display this link when published.
                </p>
              </div>

              <span
                className={`status-badge ${
                  form.is_published ? "status-active" : "status-inactive"
                }`}
              >
                {form.is_published ? "Published" : "Unpublished"}
              </span>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && (
              <div className="alert alert-success">{success}</div>
            )}

            <form onSubmit={handleSubmit} className="online-class-form">
              <div className="form-group">
                <label htmlFor="title">Class Title</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Example: Class 10 Mathematics"
                  minLength={2}
                  maxLength={150}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="url">YouTube Livestream URL</label>
                <input
                  id="url"
                  name="url"
                  type="url"
                  value={form.url}
                  onChange={handleChange}
                  placeholder="https://www.youtube.com/live/..."
                  maxLength={500}
                  required
                />
                <small>
                  Paste the complete YouTube livestream link.
                </small>
              </div>

              <div className="publish-control">
                <div>
                  <strong>Publish on public website</strong>
                  <p>
                    When enabled, visitors can see the class and join it.
                  </p>
                </div>

                <label className="switch">
                  <input
                    type="checkbox"
                    name="is_published"
                    checked={form.is_published}
                    onChange={handleChange}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>

                {form.url && (
                  <a
                    href={form.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="secondary-btn"
                  >
                    <ExternalLink size={16} />
                    Open YouTube Link
                  </a>
                )}
              </div>
            </form>

            {updatedAt && (
              <p className="updated-at">
                Last updated: {new Date(updatedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}