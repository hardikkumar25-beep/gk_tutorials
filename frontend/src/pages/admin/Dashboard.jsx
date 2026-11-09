import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Radio,
  Users,
  UserRound,
  BookOpen,
  IndianRupee,
  LogOut,
  UserPlus,
  ArrowRight,
  GraduationCap,
  RefreshCw,
  Clock,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const quickLinks = [
  {
    label: "New admission",
    detail: "Register a new student",
    icon: UserPlus,
    to: "/admin/admissions/new",
  },
  {
    label: "Students",
    detail: "View and manage students",
    icon: Users,
    to: "/admin/students",
  },
  {
    label: "Teachers",
    detail: "Manage teaching staff",
    icon: UserRound,
    to: "/admin/teachers",
  },
  {
    label: "Batches",
    detail: "Manage classes and schedules",
    icon: BookOpen,
    to: "/admin/batches",
  },
  {
    label: "Online classes",
    detail: "Manage published class links",
    icon: Radio,
    to: "/admin/online-class",
  },
];

function formatDate(dateString) {
  if (!dateString) return "—";

  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getClassLabel(classNumber, stream) {
  if (stream) {
    return `Class ${classNumber} · ${stream}`;
  }

  return `Class ${classNumber}`;
}

export default function Dashboard() {
  const { user, logout } = useAuth();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboard() {
    try {
      setError("");
      const response = await api.get("/dashboard/summary");
      setSummary(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load dashboard information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Link className="brand sidebar-brand" to="/">
          <span className="brand-mark">GK</span>
          <span>
            <strong>G.K. TUTORIALS</strong>
            <small>Management</small>
          </span>
        </Link>

        <div className="sidebar-label">MENU</div>

        <Link to="/admin" className="side-link active">
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>

        <Link to="/admin/online-class" className="side-link">
          <Radio size={18} />
          <span>Online Classes</span>
        </Link>

        <Link to="/admin/students" className="side-link">
          <Users size={18} />
          <span>Students</span>
        </Link>

        <Link to="/admin/teachers" className="side-link">
          <UserRound size={18} />
          <span>Teachers</span>
        </Link>

        <Link to="/admin/batches" className="side-link">
          <BookOpen size={18} />
          <span>Batches</span>
        </Link>

        <div className="sidebar-label sidebar-label-secondary">
          UPCOMING
        </div>

        <div className="side-link sidebar-disabled">
          <IndianRupee size={18} />
          <span>Fees & Payments</span>
          <span className="sidebar-coming-soon">Soon</span>
        </div>

        <div className="sidebar-bottom">
          <button
            className="side-link logout-button"
            onClick={logout}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <span>Management / Dashboard</span>
          <span className="admin-user">
            {user?.full_name || "Administrator"}
          </span>
        </header>

        <section className="dashboard-content">
          <div className="page-heading dashboard-heading">
            <div>
              <span className="eyebrow">OVERVIEW</span>
              <h1>Dashboard</h1>
              <p>Monitor your institute's activity and manage operations.</p>
            </div>

            <button
              className="dashboard-refresh"
              onClick={fetchDashboard}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="dashboard-error">
              <CircleAlert size={17} />
              <span>{error}</span>
            </div>
          )}

          <div className="dashboard-session">
            <div className="dashboard-session-icon">
              <GraduationCap size={21} />
            </div>

            <div>
              <span>Current academic session</span>
              <strong>
                {loading
                  ? "Loading..."
                  : summary?.academic_session || "No current session"}
              </strong>
            </div>

            <div className="session-status">
              <CheckCircle2 size={15} />
              {summary?.academic_session ? "Current session" : "Not configured"}
            </div>
          </div>

          <div className="stat-grid dashboard-stat-grid">
            <article className="stat-card">
              <div className="dashboard-stat-top">
                <span>Active students</span>
                <span className="dashboard-stat-icon">
                  <Users size={17} />
                </span>
              </div>

              <strong>
                {loading ? "—" : summary?.active_students ?? 0}
              </strong>
              <small>Currently active student records</small>
            </article>

            <article className="stat-card">
              <div className="dashboard-stat-top">
                <span>Active teachers</span>
                <span className="dashboard-stat-icon">
                  <UserRound size={17} />
                </span>
              </div>

              <strong>
                {loading ? "—" : summary?.active_teachers ?? 0}
              </strong>
              <small>Currently active teaching staff</small>
            </article>

            <article className="stat-card">
              <div className="dashboard-stat-top">
                <span>Active batches</span>
                <span className="dashboard-stat-icon">
                  <BookOpen size={17} />
                </span>
              </div>

              <strong>
                {loading ? "—" : summary?.active_batches ?? 0}
              </strong>
              <small>Currently active batches</small>
            </article>

            <article className="stat-card">
              <div className="dashboard-stat-top">
                <span>Admissions this session</span>
                <span className="dashboard-stat-icon">
                  <UserPlus size={17} />
                </span>
              </div>

              <strong>
                {loading ? "—" : summary?.admissions_this_session ?? 0}
              </strong>
              <small>Student enrolments in this session</small>
            </article>
          </div>

          <div className="content-section-heading">
            <div>
              <h2>Quick access</h2>
              <p>Shortcuts to your frequently used modules.</p>
            </div>
          </div>

          <div className="dashboard-quick-grid">
            {quickLinks.map(({ label, detail, icon: Icon, to }) => (
              <Link to={to} className="dashboard-quick-card" key={label}>
                <span className="dashboard-quick-icon">
                  <Icon size={20} />
                </span>

                <span className="dashboard-quick-text">
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>

                <ArrowRight
                  size={16}
                  className="dashboard-quick-arrow"
                />
              </Link>
            ))}
          </div>

          <div className="dashboard-lower-grid">
            <section className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>Recent admissions</h2>
                  <p>Latest student enrolments in this session.</p>
                </div>

                <Link to="/admin/students">
                  View students <ArrowRight size={14} />
                </Link>
              </div>

              {loading ? (
                <div className="dashboard-message">
                  Loading admissions...
                </div>
              ) : summary?.recent_admissions?.length > 0 ? (
                <div className="recent-admissions-list">
                  {summary.recent_admissions.map((admission) => (
                    <div
                      className="recent-admission"
                      key={admission.student_code}
                    >
                      <div className="recent-admission-avatar">
                        {admission.student_name?.charAt(0)?.toUpperCase()}
                      </div>

                      <div className="recent-admission-info">
                        <strong>{admission.student_name}</strong>
                        <small>
                          {admission.student_code}
                        </small>
                      </div>

                      <div className="recent-admission-meta">
                        <strong>
                          {getClassLabel(
                            admission.class_number,
                            admission.stream
                          )}
                        </strong>
                        <small>
                          {formatDate(admission.admission_date)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-message">
                  No admissions found for this academic session.
                </div>
              )}
            </section>

            <section className="dashboard-panel dashboard-status-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>Online classes</h2>
                  <p>Current public class status.</p>
                </div>
              </div>

              <div className="online-status-content">
                <div
                  className={`online-status-indicator ${
                    summary?.online_class_published ? "published" : "unpublished"
                  }`}
                >
                  {summary?.online_class_published ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <Clock size={20} />
                  )}
                </div>

                <div>
                  <strong>
                    {loading
                      ? "Loading..."
                      : summary?.online_class_published
                        ? "Published"
                        : "Not published"}
                  </strong>

                  <p>
                    {loading
                      ? "Checking online class status."
                      : summary?.online_class_published
                        ? summary?.online_class_title ||
                          "Your online class is visible on the public website."
                        : "No online class is currently visible on the public website."}
                  </p>
                </div>
              </div>

              <Link
                to="/admin/online-class"
                className="dashboard-manage-link"
              >
                Manage online class
                <ArrowRight size={15} />
              </Link>
            </section>
          </div>

          <section className="dashboard-upcoming">
            <div className="dashboard-upcoming-icon">
              <IndianRupee size={21} />
            </div>

            <div className="dashboard-upcoming-info">
              <strong>Fees & Payments</strong>
              <p>
                Fee collection, payment records and outstanding balances.
              </p>
            </div>

            <span className="dashboard-upcoming-badge">
              In Progress
            </span>
          </section>
        </section>
      </main>
    </div>
  );
}