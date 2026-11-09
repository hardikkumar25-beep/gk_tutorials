import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle,
  GraduationCap,
  LogOut,
  UserPlus,
  Users,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const initialForm = {
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
  class_number: "",
  stream: "",
  admission_date: getToday(),
};

function cleanOptional(value) {
  return value.trim() || null;
}

export default function AdmissionForm() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [session, setSession] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const [step, setStep] = useState("details");
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successStudent, setSuccessStudent] = useState(null);

  // Load the current academic session.
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await api.get("/academic-sessions/current");

        if (!cancelled) {
          setSession(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
              "Unable to load the current academic session."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSession(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load subjects whenever class or stream changes.
  useEffect(() => {
    let cancelled = false;

    async function loadSubjects() {
      setSubjects([]);
      setSelectedSubjects([]);

      if (!form.class_number) {
        setLoadingSubjects(false);
        return;
      }

      if (
        ["11", "12"].includes(form.class_number) &&
        !form.stream
      ) {
        setLoadingSubjects(false);
        return;
      }

      setLoadingSubjects(true);

      try {
        const params = {
          class_number: Number(form.class_number),
        };

        if (form.stream) {
          params.stream = form.stream;
        }

        const response = await api.get("/subjects", { params });

        if (!cancelled) {
          setSubjects(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
              "Unable to load subjects for this class."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSubjects(false);
        }
      }
    }

    loadSubjects();

    return () => {
      cancelled = true;
    };
  }, [form.class_number, form.stream]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
  }

  function handleClassChange(value) {
    setForm((current) => ({
      ...current,
      class_number: value,
      stream: "",
    }));

    setSubjects([]);
    setSelectedSubjects([]);
    setError("");
  }

  function toggleSubject(subjectId) {
    setSelectedSubjects((current) =>
      current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId]
    );
  }

  function validateForm() {
    if (!form.full_name.trim()) {
      return "Student name is required.";
    }

    if (form.full_name.trim().length < 2) {
      return "Student name must contain at least 2 characters.";
    }

    if (
      !form.student_phone.trim() &&
      !form.mother_phone.trim() &&
      !form.father_phone.trim()
    ) {
      return "Enter at least one contact number.";
    }

    if (!form.class_number) {
      return "Please select a class.";
    }

    if (
      ["11", "12"].includes(form.class_number) &&
      !form.stream
    ) {
      return "Please select a stream.";
    }

    if (selectedSubjects.length === 0) {
      return "Select at least one subject.";
    }

    if (!form.admission_date) {
      return "Admission date is required.";
    }

    if (form.admission_date > getToday()) {
      return "Admission date cannot be in the future.";
    }

    if (
      form.date_of_birth &&
      form.date_of_birth > getToday()
    ) {
      return "Date of birth cannot be in the future.";
    }

    return "";
  }

  function goToReview() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!session) {
      setError("A current academic session is required.");
      return;
    }

    setError("");
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitAdmission() {
    setSubmitting(true);
    setError("");

    const payload = {
      student: {
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: cleanOptional(form.gender),
        email: cleanOptional(form.email),
        student_phone: cleanOptional(form.student_phone),
        mother_phone: cleanOptional(form.mother_phone),
        father_phone: cleanOptional(form.father_phone),
        address: cleanOptional(form.address),
        school_name: cleanOptional(form.school_name),
        school_address: cleanOptional(form.school_address),
        referral_source: cleanOptional(form.referral_source),
      },
      academic_session_id: session.id,
      class_number: Number(form.class_number),
      stream: form.stream || null,
      subject_ids: selectedSubjects,
      admission_date: form.admission_date,
    };

    try {
      const response = await api.post(
        "/students/admissions",
        payload
      );

      setSuccessStudent(response.data);
      setStep("success");

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Admission could not be completed. Check the details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getSelectedSubjectNames() {
    return subjects
      .filter((subject) => selectedSubjects.includes(subject.id))
      .map((subject) => subject.subject_name);
  }

  return (
    <div className="admin-shell">
      {/* Sidebar */}
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

        <Link className="side-link active" to="/admin/admissions/new">
          <UserPlus size={18} />
          New Admission
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

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <span>Management / Students / New Admission</span>

          <span className="admin-user">
            {user?.full_name || "Administrator"}
          </span>
        </header>

        <section className="dashboard-content admission-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">STUDENT MANAGEMENT</span>
              <h1>New Admission</h1>
              <p>Register a student for the current academic session.</p>
            </div>

            <Link
              className="button button-outline"
              to="/admin/students"
            >
              <ArrowLeft size={15} />
              Back to Students
            </Link>
          </div>

          {/* Progress */}
          {step !== "success" && (
            <div className="admission-progress">
              <div className={step === "details" ? "progress-step active" : "progress-step completed"}>
                <span>
                  {step === "review" ? <Check size={15} /> : "1"}
                </span>
                Student Details
              </div>

              <div className="progress-line" />

              <div className={step === "review" ? "progress-step active" : "progress-step"}>
                <span>2</span>
                Review & Confirm
              </div>
            </div>
          )}

          {error && (
            <div className="student-error admission-error">
              {error}
            </div>
          )}

          {/* Loading session */}
          {loadingSession && step === "details" && (
            <div className="admission-card">
              Loading current academic session...
            </div>
          )}

          {!loadingSession && !session && step === "details" && (
            <div className="admission-card">
              <h3>No current academic session</h3>
              <p>
                Set an academic session as current before registering students.
              </p>
            </div>
          )}

          {/* DETAILS STEP */}
          {step === "details" && session && !loadingSession && (
            <>
              <div className="admission-session">
                <GraduationCap size={19} />

                <div>
                  <small>Current Academic Session</small>
                  <strong>{session.name}</strong>
                </div>

                <span className="session-current">Current</span>
              </div>

              <div className="admission-card">
                {/* Student details */}
                <div className="admission-section-heading">
                  <div className="admission-section-icon">
                    <UserPlus size={18} />
                  </div>

                  <div>
                    <h2>Student Information</h2>
                    <p>Enter the student's personal details.</p>
                  </div>
                </div>

                <div className="admission-grid">
                  <label className="admission-field field-full">
                    Full Name *
                    <input
                      value={form.full_name}
                      onChange={(e) =>
                        updateField("full_name", e.target.value)
                      }
                      placeholder="Enter student's full name"
                      maxLength={150}
                    />
                  </label>

                  <label className="admission-field">
                    Date of Birth
                    <input
                      type="date"
                      max={getToday()}
                      value={form.date_of_birth}
                      onChange={(e) =>
                        updateField("date_of_birth", e.target.value)
                      }
                    />
                  </label>

                  <label className="admission-field">
                    Gender
                    <select
                      value={form.gender}
                      onChange={(e) =>
                        updateField("gender", e.target.value)
                      }
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label className="admission-field field-full">
                    Email Address
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        updateField("email", e.target.value)
                      }
                      placeholder="student@example.com"
                    />
                  </label>
                </div>

                <div className="admission-divider" />

                {/* Contact details */}
                <div className="admission-section-heading">
                  <div className="admission-section-icon">
                    <Users size={18} />
                  </div>

                  <div>
                    <h2>Contact Information</h2>
                    <p>At least one contact number is required.</p>
                  </div>
                </div>

                <div className="admission-grid">
                  <label className="admission-field">
                    Student Contact Number
                    <input
                      type="tel"
                      value={form.student_phone}
                      onChange={(e) =>
                        updateField("student_phone", e.target.value)
                      }
                      placeholder="Student phone"
                      maxLength={20}
                    />
                  </label>

                  <label className="admission-field">
                    Mother's Contact Number
                    <input
                      type="tel"
                      value={form.mother_phone}
                      onChange={(e) =>
                        updateField("mother_phone", e.target.value)
                      }
                      placeholder="Mother's phone"
                      maxLength={20}
                    />
                  </label>

                  <label className="admission-field">
                    Father's Contact Number
                    <input
                      type="tel"
                      value={form.father_phone}
                      onChange={(e) =>
                        updateField("father_phone", e.target.value)
                      }
                      placeholder="Father's phone"
                      maxLength={20}
                    />
                  </label>

                  <label className="admission-field field-full">
                    Residential Address
                    <textarea
                      value={form.address}
                      onChange={(e) =>
                        updateField("address", e.target.value)
                      }
                      placeholder="Enter residential address"
                      rows={3}
                    />
                  </label>
                </div>

                <div className="admission-divider" />

                {/* School details */}
                <div className="admission-section-heading">
                  <div className="admission-section-icon">
                    <BookOpen size={18} />
                  </div>

                  <div>
                    <h2>School Information</h2>
                    <p>Enter the student's school details.</p>
                  </div>
                </div>

                <div className="admission-grid">
                  <label className="admission-field">
                    School Name
                    <input
                      value={form.school_name}
                      onChange={(e) =>
                        updateField("school_name", e.target.value)
                      }
                      placeholder="Enter school name"
                      maxLength={180}
                    />
                  </label>

                  <label className="admission-field">
                    How did you hear about G.K. Tutorials?
                    <select
                      value={form.referral_source}
                      onChange={(e) =>
                        updateField("referral_source", e.target.value)
                      }
                    >
                      <option value="">Select source</option>
                      <option value="Friend">Friend</option>
                      <option value="Existing Student">Existing Student</option>
                      <option value="Family">Family</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Google">Google</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label className="admission-field field-full">
                    School Address
                    <textarea
                      value={form.school_address}
                      onChange={(e) =>
                        updateField("school_address", e.target.value)
                      }
                      placeholder="Enter school address"
                      rows={2}
                    />
                  </label>
                </div>

                <div className="admission-divider" />

                {/* Academic details */}
                <div className="admission-section-heading">
                  <div className="admission-section-icon">
                    <GraduationCap size={18} />
                  </div>

                  <div>
                    <h2>Academic Details</h2>
                    <p>Select the class, stream and opted subjects.</p>
                  </div>
                </div>

                <div className="admission-grid">
                  <label className="admission-field">
                    Academic Session
                    <input value={session.name} disabled />
                  </label>

                  <label className="admission-field">
                    Admission Date *
                    <input
                      type="date"
                      max={getToday()}
                      value={form.admission_date}
                      onChange={(e) =>
                        updateField("admission_date", e.target.value)
                      }
                    />
                  </label>

                  <label className="admission-field">
                    Class *
                    <select
                      value={form.class_number}
                      onChange={(e) =>
                        handleClassChange(e.target.value)
                      }
                    >
                      <option value="">Select class</option>
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                    </select>
                  </label>

                  {["11", "12"].includes(form.class_number) && (
                    <label className="admission-field">
                      Stream *
                      <select
                        value={form.stream}
                        onChange={(e) =>
                          updateField("stream", e.target.value)
                        }
                      >
                        <option value="">Select stream</option>
                        <option value="Science">Science</option>
                        <option value="Commerce">Commerce</option>
                      </select>
                    </label>
                  )}
                </div>

                {/* Subjects */}
                {form.class_number && (
                  <div className="subject-selection">
                    <div className="subject-selection-heading">
                      <div>
                        <h3>Subjects Opted *</h3>
                        <p>Select all subjects the student wants to study.</p>
                      </div>

                      <span>
                        {selectedSubjects.length} selected
                      </span>
                    </div>

                    {loadingSubjects ? (
                      <p className="subject-loading">
                        Loading available subjects...
                      </p>
                    ) : !form.stream &&
                      ["11", "12"].includes(form.class_number) ? (
                      <p className="subject-loading">
                        Select a stream to view available subjects.
                      </p>
                    ) : subjects.length === 0 ? (
                      <p className="subject-loading">
                        No active subjects found for this class.
                      </p>
                    ) : (
                      <div className="subject-option-grid">
                        {subjects.map((subject) => {
                          const checked = selectedSubjects.includes(
                            subject.id
                          );

                          return (
                            <label
                              key={subject.id}
                              className={`subject-option ${
                                checked ? "selected" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleSubject(subject.id)
                                }
                              />

                              <span className="subject-checkbox">
                                {checked && <Check size={13} />}
                              </span>

                              <span>{subject.subject_name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="admission-actions">
                  <Link
                    className="button button-outline"
                    to="/admin/students"
                  >
                    Cancel
                  </Link>

                  <button
                    className="button button-primary"
                    onClick={goToReview}
                    disabled={loadingSubjects}
                  >
                    Review Admission
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* REVIEW STEP */}
          {step === "review" && (
            <div className="admission-card">
              <div className="admission-section-heading">
                <div className="admission-section-icon">
                  <CheckCircle size={18} />
                </div>

                <div>
                  <h2>Review Admission Details</h2>
                  <p>Verify the information before saving the admission.</p>
                </div>
              </div>

              <div className="review-section">
                <h3>Student Information</h3>

                <div className="profile-grid">
                  <ReviewField label="Full Name" value={form.full_name} />
                  <ReviewField label="Date of Birth" value={form.date_of_birth} />
                  <ReviewField label="Gender" value={form.gender} />
                  <ReviewField label="Email" value={form.email} />
                </div>
              </div>

              <div className="review-section">
                <h3>Contact Information</h3>

                <div className="profile-grid">
                  <ReviewField label="Student Phone" value={form.student_phone} />
                  <ReviewField label="Mother's Phone" value={form.mother_phone} />
                  <ReviewField label="Father's Phone" value={form.father_phone} />
                  <ReviewField label="Address" value={form.address} />
                </div>
              </div>

              <div className="review-section">
                <h3>School Information</h3>

                <div className="profile-grid">
                  <ReviewField label="School Name" value={form.school_name} />
                  <ReviewField label="School Address" value={form.school_address} />
                  <ReviewField label="Referral Source" value={form.referral_source} />
                </div>
              </div>

              <div className="review-section">
                <h3>Academic Information</h3>

                <div className="profile-grid">
                  <ReviewField label="Academic Session" value={session?.name} />
                  <ReviewField label="Class" value={`Class ${form.class_number}`} />
                  <ReviewField label="Stream" value={form.stream || "Not applicable"} />
                  <ReviewField label="Admission Date" value={form.admission_date} />
                </div>

                <div className="review-subjects">
                  <span>Selected Subjects</span>

                  <div className="subject-tags">
                    {getSelectedSubjectNames().map((name) => (
                      <span key={name}>{name}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="admission-actions">
                <button
                  className="button button-outline"
                  onClick={() => {
                    setStep("details");
                    setError("");
                  }}
                  disabled={submitting}
                >
                  <ArrowLeft size={15} />
                  Edit Details
                </button>

                <button
                  className="button button-primary"
                  onClick={submitAdmission}
                  disabled={submitting}
                >
                  {submitting ? "Saving Admission..." : "Confirm Admission"}
                  {!submitting && <CheckCircle size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === "success" && successStudent && (
            <div className="admission-card admission-success">
              <div className="success-icon">
                <CheckCircle size={34} />
              </div>

              <h2>Admission Completed</h2>

              <p>
                The student has been successfully registered in the database.
              </p>

              <div className="success-student-code">
                <span>Generated Student ID</span>
                <strong>{successStudent.student_code}</strong>
              </div>

              <div className="success-student-name">
                {successStudent.full_name}
              </div>

              <div className="admission-actions success-actions">
                <Link
                  className="button button-outline"
                  to="/admin/students"
                >
                  View Students
                </Link>

                <button
                  className="button button-primary"
                  onClick={() =>
                    navigate(`/admin/students/${successStudent.id}`)
                  }
                >
                  View Student Profile
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ReviewField({ label, value }) {
  return (
    <div className="profile-detail">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}