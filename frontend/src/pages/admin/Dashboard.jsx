import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BookOpen, CalendarCheck, ClipboardList, IndianRupee, LayoutDashboard, LogOut, UserPlus, Users } from "lucide-react";

const actions = [
  { label: "New admission", detail: "Register a student", icon: UserPlus },
  { label: "Record payment", detail: "Add a fee payment", icon: IndianRupee },
  { label: "Attendance", detail: "Record today's absences", icon: CalendarCheck },
  { label: "Enter test marks", detail: "Update student results", icon: ClipboardList },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <a className="brand sidebar-brand" href="/"><span className="brand-mark">GK</span><span><strong>G.K. TUTORIALS</strong><small>Management</small></span></a>
        <div className="sidebar-label">MENU</div>
        <a className="side-link active"><LayoutDashboard size={18} /> Dashboard</a>
        <a className="side-link"><ClipboardList size={18} /> Enquiries</a>
        <Link className="side-link" to="/admin/students"><Users size={18} />Students</Link>
        <a className="side-link"><BookOpen size={18} /> Batches</a>
        <a className="side-link"><IndianRupee size={18} /> Fees & payments</a>
        <a className="side-link"><CalendarCheck size={18} /> Attendance</a>
        <a className="side-link"><ClipboardList size={18} /> Tests & marks</a>
        <div className="sidebar-bottom"><button className="side-link logout-button" onClick={logout}><LogOut size={18} /> Sign out</button></div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><span>Management / Dashboard</span><span className="admin-user">{user?.full_name || "Administrator"}</span></header>
        <section className="dashboard-content">
          <div className="page-heading"><div><span className="eyebrow">OVERVIEW</span><h1>Good day.</h1><p>Here is your institute at a glance.</p></div><span className="session-chip">Academic session setup pending</span></div>
          <div className="stat-grid">
            <article className="stat-card"><span>Total students</span><strong>—</strong><small>Active student records</small></article>
            <article className="stat-card"><span>New enquiries</span><strong>—</strong><small>Awaiting follow-up</small></article>
            <article className="stat-card"><span>Pending fees</span><strong>—</strong><small>Outstanding payments</small></article>
            <article className="stat-card"><span>Today's absences</span><strong>—</strong><small>Attendance not yet entered</small></article>
          </div>
          <div className="content-section-heading"><div><h2>Quick actions</h2><p>Common tasks, kept close at hand.</p></div></div>
          <div className="action-grid">{actions.map(({ label, detail, icon: Icon }) => <button className="action-card" key={label} disabled><span className="action-icon"><Icon size={20} /></span><span><strong>{label}</strong><small>{detail}</small></span><span className="coming-soon">Next phase</span></button>)}</div>
          <div className="content-section-heading"><div><h2>Needs attention</h2><p>Items requiring action will appear here.</p></div></div>
          <div className="empty-state"><div className="empty-icon"><ClipboardList size={22} /></div><strong>Your workspace is ready.</strong><span>Once we add the enquiry and student modules, pending tasks will appear here.</span></div>
        </section>
      </main>
    </div>
  );
}
