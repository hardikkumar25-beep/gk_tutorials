import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Pencil,
  Save,
  X,
  Ban,
  LogOut,
  RefreshCw,
  BookOpen,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

function getErrorMessage(err, fallback) {
  const detail = err.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg || "Invalid input")
      .join(". ");
  }

  return fallback;
}

export default function Teachers() {
  const { user, logout } = useAuth();

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");

  const [deactivatingId, setDeactivatingId] = useState(null);

  async function loadTeachers() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/teachers", {
        params: { is_active: true },
      });

      const data = response.data;
      setTeachers(Array.isArray(data) ? data : data.items ?? []);
    } catch (err) {
      setTeachers([]);
      setError(
        getErrorMessage(
          err,
          "Unable to load teachers. Please check the backend."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeachers();
  }, []);

  function openAddForm() {
    setEditingId(null);
    setName("");
    setSaveError("");
    setSuccess("");
    setFormOpen(true);
  }

  function openEditForm(teacher) {
    setEditingId(teacher.id);
    setName(teacher.name);
    setSaveError("");
    setSuccess("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setName("");
    setSaveError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setSaveError("Teacher name must contain at least 2 characters.");
      return;
    }

    setSaving(true);
    setSaveError("");
    setSuccess("");

    try {
      if (editingId !== null) {
        await api.patch(`/teachers/${editingId}`, {
          name: trimmedName,
        });

        setSuccess("Teacher updated successfully.");
      } else {
        await api.post("/teachers", {
          name: trimmedName,
        });

        setSuccess("Teacher added successfully.");
      }

      closeForm();
      await loadTeachers();
    } catch (err) {
      setSaveError(
        getErrorMessage(err, "Unable to save teacher details.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(teacher) {
    const confirmed = window.confirm(
      `Deactivate ${teacher.name}? They will no longer be available for new batch assignments.`
    );

    if (!confirmed) return;

    setDeactivatingId(teacher.id);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/teachers/${teacher.id}/deactivate`);

      setTeachers((previous) =>
        previous.filter((item) => item.id !== teacher.id)
      );

      setSuccess(`${teacher.name} has been deactivated.`);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to deactivate this teacher."
        )
      );
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Link className="brand sidebar-brand" to="/admin">
          <span className="brand-mark">GK</span>

          <span>
            <strong>G.K. TUTORIALS</strong>
            <small>Management</small>
          </span>
        </Link>

        <div className="sidebar-label">MENU</div>

        <Link className="side-link" to="/admin">
          Dashboard
        </Link>

        <Link className="side-link" to="/admin/students">
          <Users size={18} />
          Students
        </Link>

        <Link className="side-link active" to="/admin/teachers">
          <Users size={18} />
          Teachers
        </Link>
        <Link className="side-link" to="/admin/batches">
          <BookOpen size={18} />
          Batches
        </Link>

        <div className="sidebar-bottom">
          <button
            className="side-link logout-button"
            onClick={logout}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <span>Management / Teachers</span>

          <span className="admin-user">
            {user?.full_name || "Administrator"}
          </span>
        </header>

        <section className="dashboard-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">TEACHER MANAGEMENT</span>
              <h1>Teachers</h1>
              <p>Manage the teachers working at your institute.</p>
            </div>

            <div className="student-heading-actions">
              <Link
                className="button button-outline"
                to="/admin"
              >
                <ArrowLeft size={15} />
                Dashboard
              </Link>

              <button
                className="button button-primary"
                onClick={openAddForm}
              >
                <UserPlus size={16} />
                Add Teacher
              </button>
            </div>
          </div>

          {success && (
            <div className="profile-success-message">
              {success}
            </div>
          )}

          {error && (
            <div className="student-error">
              {error}
            </div>
          )}

          {formOpen && (
            <div className="profile-card">
              <div className="profile-card-heading">
                <div>
                  {editingId !== null ? (
                    <Pencil size={19} />
                  ) : (
                    <UserPlus size={19} />
                  )}

                  <h2>
                    {editingId !== null
                      ? "Edit Teacher"
                      : "Add New Teacher"}
                  </h2>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="profile-form-grid">
                  <label className="profile-form-field">
                    <span>Teacher Name *</span>

                    <input
                      type="text"
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      placeholder="Enter teacher's full name"
                      minLength={2}
                      maxLength={100}
                      required
                      autoFocus
                    />
                  </label>
                </div>

                {saveError && (
                  <div className="profile-error-message">
                    {saveError}
                  </div>
                )}

                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    <X size={15} />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={saving}
                  >
                    <Save size={15} />
                    {saving
                      ? "Saving..."
                      : editingId !== null
                        ? "Save Changes"
                        : "Add Teacher"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="student-toolbar">
            <div>
              <strong>{teachers.length}</strong>{" "}
              active {teachers.length === 1 ? "teacher" : "teachers"}
            </div>

            <button
              className="button button-outline"
              onClick={loadTeachers}
              disabled={loading}
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>

          <div className="student-table-wrap">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="table-message">
                      Loading teachers...
                    </td>
                  </tr>
                ) : teachers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="table-message">
                      No active teachers found. Add your first teacher.
                    </td>
                  </tr>
                ) : (
                  teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>
                        <strong>{teacher.name}</strong>
                      </td>

                      <td>
                        <span className="status-pill status-active">
                          Active
                        </span>
                      </td>

                      <td>
                        <div className="student-heading-actions">
                          <button
                            className="button button-outline"
                            onClick={() => openEditForm(teacher)}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            className="button button-danger-outline"
                            onClick={() => handleDeactivate(teacher)}
                            disabled={deactivatingId === teacher.id}
                          >
                            <Ban size={14} />
                            {deactivatingId === teacher.id
                              ? "Deactivating..."
                              : "Deactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}