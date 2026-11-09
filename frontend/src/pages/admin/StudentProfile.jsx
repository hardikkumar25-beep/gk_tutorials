
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Mail,
  MapPin,
  School,
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

export default function StudentProfile() {
  const { studentId } = useParams();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStudent() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/students/${studentId}`);

        if (!cancelled) {
          setStudent(response.data);
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

        {/* Top bar */}
        <header className="admin-topbar">
          <span>Management / Students / Profile</span>
          <span className="admin-user">Institute Admin</span>
        </header>

        <section className="dashboard-content">

          {/* Page heading */}
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                STUDENT MANAGEMENT
              </span>

              <h1>{student.full_name}</h1>

              <p>
                Student ID: {student.student_code}
              </p>
            </div>

            <Link
              to="/admin/students"
              className="button button-outline"
            >
              <ArrowLeft size={15} />
              Back to Students
            </Link>
          </div>

          {/* Student summary */}
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
            <div className="profile-card-heading">
              <User size={19} />
              <h2>Personal Information</h2>
            </div>

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
          </div>

          {/* Address and school */}
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

          {/* Academic enrolments */}
          <div className="profile-card">
            <div className="profile-card-heading">
              <GraduationCap size={20} />
              <h2>Academic Enrolments</h2>
            </div>

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
