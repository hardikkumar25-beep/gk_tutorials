
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  User,
  GraduationCap,
  BookOpen,
  CalendarDays,
  MapPin,
  Pencil,
  Save,
  X,
  Ban,
} from "lucide-react";

import api from "../../services/api";

function formatDate(date) {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function Detail({ label, value }) {
  return (
    <div className="profile-detail">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function Status({ value }) {
  const status = value || "unknown";

  return (
    <span
      className={`status-pill ${
        status === "active"
          ? "status-active"
          : "status-inactive"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

const emptyForm = {
  full_name: "",
  date_of_birth: "",
  gender: "",
  email: "",
  student_phone: "",
  mother_phone: "",
  father_phone: "",
  address: "",
  school_name: "",
  school_address: "",
  referral_source: "",
};

function createFormData(student) {
  return {
    full_name: student.full_name || "",
    date_of_birth: student.date_of_birth || "",
    gender: student.gender || "",
    email: student.email || "",
    student_phone: student.student_phone || "",
    mother_phone: student.mother_phone || "",
    father_phone: student.father_phone || "",
    address: student.address || "",
    school_name: student.school_name || "",
    school_address: student.school_address || "",
    referral_source: student.referral_source || "",
  };
}
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
function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  max,
}) {
  return (
    <label className="profile-form-field">
      <span>{label}{required ? " *" : ""}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        max={max}
      />
    </label>
  );
}
function getToday() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
export default function StudentProfile() {
  const { studentId } = useParams();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStudent() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/students/${studentId}`);

        if (!cancelled) {
          setStudent(response.data);
          setForm(createFormData(response.data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
              "Unable to load this student's profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStudent();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  function startEditing() {
    setForm(createFormData(student));
    setSaveError("");
    setSaveSuccess("");
    setEditing(true);
  }

  function stopEditing() {
    setForm(createFormData(student));
    setSaveError("");
    setEditing(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

    async function handleSave(event) {
    event.preventDefault();

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    const payload = {
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender.trim() || null,
        email: form.email.trim() || null,
        student_phone: form.student_phone.trim() || null,
        mother_phone: form.mother_phone.trim() || null,
        father_phone: form.father_phone.trim() || null,
        address: form.address.trim() || null,
        school_name: form.school_name.trim() || null,
        school_address: form.school_address.trim() || null,
        referral_source: form.referral_source.trim() || null,
    };

    try {
        const response = await api.patch(
        `/students/${studentId}`,
        payload
        );

        setStudent(response.data);
        setForm(createFormData(response.data));
        setEditing(false);
        setSaveSuccess("Student details updated successfully.");
    } catch (err) {
        setSaveError(
        getErrorMessage(
            err,
            "Unable to update student details."
        )
        );
    } finally {
        setSaving(false);
    }
    }

  async function handleCancelEnrollment(enrollment) {
    const confirmed = window.confirm(
      `Cancel admission for ${student.full_name} in Class ${enrollment.class_number}? This will preserve the historical record but mark this enrolment as cancelled.`
    );

    if (!confirmed) return;

    setCancellingId(enrollment.id);
    setCancelError("");

    try {
      const response = await api.patch(
        `/students/${studentId}/enrollments/${enrollment.id}/cancel`
      );

      setStudent(response.data);
    } catch (err) {
  setCancelError(
    getErrorMessage(
      err,
      "Unable to cancel this admission."
    )
  );
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="admin-shell">
        <main className="admin-main">
          <div className="profile-loading">
            Loading student profile...
          </div>
        </main>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="admin-shell">
        <main className="admin-main">
          <section className="dashboard-content">
            <Link
              to="/admin/students"
              className="button button-outline"
            >
              <ArrowLeft size={15} />
              Back to Students
            </Link>

            <div className="student-error">
              {error || "Student record not found."}
            </div>
          </section>
        </main>
      </div>
    );
  }

  const enrollments = student.enrollments || [];

  return (
    <div className="admin-shell">
      <main className="admin-main">
        <header className="admin-topbar">
          <span>Management / Students / Profile</span>
          <span className="admin-user">Institute Admin</span>
        </header>

        <section className="dashboard-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                STUDENT MANAGEMENT
              </span>

              <h1>{student.full_name}</h1>

              <p>Student ID: {student.student_code}</p>
            </div>

            <Link
              to="/admin/students"
              className="button button-outline"
            >
              <ArrowLeft size={15} />
              Back to Students
            </Link>
          </div>

          {saveSuccess && (
            <div className="profile-success-message">
              {saveSuccess}
            </div>
          )}

          <div className="profile-summary">
            <div className="profile-avatar">
              <User size={28} />
            </div>

            <div className="profile-summary-info">
              <h2>{student.full_name}</h2>
              <span>{student.student_code}</span>
            </div>

            <Status value={student.status} />
          </div>

          {/* Personal information */}
          <div className="profile-card">
            <div className="profile-card-heading profile-edit-heading">
              <div>
                <User size={19} />
                <h2>Personal Information</h2>
              </div>

              {!editing && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={startEditing}
                >
                  <Pencil size={15} />
                  Edit Details
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave}>
                <div className="profile-form-grid">
                  <FormField
                    label="Full Name"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                  />

                <FormField
                    label="Date of Birth"
                    name="date_of_birth"
                    type="date"
                    value={form.date_of_birth}
                    onChange={handleChange}
                    max={getToday()}
                />

                  <label className="profile-form-field">
                    <span>Gender</span>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <FormField
                    label="Email Address"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                  />

                  <FormField
                    label="Student Contact"
                    name="student_phone"
                    value={form.student_phone}
                    onChange={handleChange}
                  />

                  <FormField
                    label="Mother's Contact"
                    name="mother_phone"
                    value={form.mother_phone}
                    onChange={handleChange}
                  />

                  <FormField
                    label="Father's Contact"
                    name="father_phone"
                    value={form.father_phone}
                    onChange={handleChange}
                  />

                  <FormField
                    label="Referral Source"
                    name="referral_source"
                    value={form.referral_source}
                    onChange={handleChange}
                  />

                  <FormField
                    label="Residential Address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                  />

                  <FormField
                    label="School Name"
                    name="school_name"
                    value={form.school_name}
                    onChange={handleChange}
                  />

                  <FormField
                    label="School Address"
                    name="school_address"
                    value={form.school_address}
                    onChange={handleChange}
                  />
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
                    onClick={stopEditing}
                    disabled={saving}
                  >
                    <X size={15} />
                    Discard
                  </button>

                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={saving}
                  >
                    <Save size={15} />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-grid">
                <Detail
                  label="Full Name"
                  value={student.full_name}
                />

                <Detail
                  label="Date of Birth"
                  value={formatDate(student.date_of_birth)}
                />

                <Detail
                  label="Gender"
                  value={student.gender}
                />

                <Detail
                  label="Email Address"
                  value={student.email}
                />

                <Detail
                  label="Student Contact"
                  value={student.student_phone}
                />

                <Detail
                  label="Mother's Contact"
                  value={student.mother_phone}
                />

                <Detail
                  label="Father's Contact"
                  value={student.father_phone}
                />

                <Detail
                  label="Referral Source"
                  value={student.referral_source}
                />
              </div>
            )}
          </div>

          {/* Address and school */}
          {!editing && (
            <div className="profile-card">
              <div className="profile-card-heading">
                <MapPin size={19} />
                <h2>Address & School</h2>
              </div>

              <div className="profile-grid">
                <Detail
                  label="Residential Address"
                  value={student.address}
                />

                <Detail
                  label="School Name"
                  value={student.school_name}
                />

                <Detail
                  label="School Address"
                  value={student.school_address}
                />
              </div>
            </div>
          )}

          {/* Academic enrolments */}
          <div className="profile-card">
            <div className="profile-card-heading">
              <GraduationCap size={20} />
              <h2>Academic Enrolments</h2>
            </div>

            {cancelError && (
              <div className="profile-error-message">
                {cancelError}
              </div>
            )}

            {enrollments.length === 0 ? (
              <p className="profile-empty">
                No academic enrolments found.
              </p>
            ) : (
              <div className="enrollment-list">
                {enrollments.map((enrollment) => (
                  <div
                    className="enrollment-card"
                    key={enrollment.id}
                  >
                    <div className="enrollment-heading">
                      <div>
                        <h3>
                          Class {enrollment.class_number}
                          {enrollment.stream
                            ? ` · ${enrollment.stream}`
                            : ""}
                        </h3>

                        <span>
                          Session:{" "}
                          {enrollment.academic_session?.name ||
                            enrollment.academic_session_id}
                        </span>
                      </div>

                      <Status value={enrollment.status} />
                    </div>

                    <div className="enrollment-meta">
                      <span>
                        <CalendarDays size={15} />
                        Admission:{" "}
                        {formatDate(enrollment.admission_date)}
                      </span>
                    </div>

                    <div className="enrollment-subjects">
                      <strong>
                        <BookOpen size={16} />
                        Subjects
                      </strong>

                      <div className="subject-tags">
                        {enrollment.subjects?.length ? (
                          enrollment.subjects.map((subject) => (
                            <span key={subject.id}>
                              {subject.subject_name}
                            </span>
                          ))
                        ) : (
                          <span>No subjects assigned</span>
                        )}
                      </div>
                    </div>

                    {enrollment.status === "active" && (
                      <div className="enrollment-actions">
                        <button
                          type="button"
                          className="button button-danger-outline"
                          onClick={() =>
                            handleCancelEnrollment(enrollment)
                          }
                          disabled={cancellingId !== null}
                        >
                          <Ban size={15} />
                          {cancellingId === enrollment.id
                            ? "Cancelling..."
                            : "Cancel Admission"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
    );
}
