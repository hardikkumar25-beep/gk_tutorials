
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Users,
  LogOut,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const PAGE_SIZE = 20;

export default function Students() {
  const { user, logout } = useAuth();

  // Student records received from the backend
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);

  // Search and filter values
  const [search, setSearch] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [stream, setStream] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState("");

  // Pagination
  const [page, setPage] = useState(0);

  // Request state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    // Small delay prevents an API request for every keystroke.
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = {
          skip: page * PAGE_SIZE,
          limit: PAGE_SIZE,
        };

        if (search.trim()) {
          params.search = search.trim();
        }

        if (classNumber) {
          params.class_number = Number(classNumber);
        }

        if (stream) {
          params.stream = stream;
        }

        if (enrollmentStatus) {
          params.enrollment_status = enrollmentStatus;
        }

        const response = await api.get("/students", { params });

        if (!cancelled) {
          setStudents(response.data.items ?? []);
          setTotal(response.data.total ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setStudents([]);
          setTotal(0);

          setError(
            err.response?.data?.detail ||
            "Unable to load students. Please check the backend."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    search,
    classNumber,
    stream,
    enrollmentStatus,
    page,
  ]);

  function handleFilterChange(setter, value) {
    setter(value);
    setPage(0);
  }

  function getStudentClass(student) {
    const enrollment =
      student.enrollments?.find(
        (item) => item.status === "active"
      ) || student.enrollments?.[0];

    if (!enrollment) return "—";

    return `Class ${enrollment.class_number}${
      enrollment.stream ? ` · ${enrollment.stream}` : ""
    }`;
  }

  function getEnrollmentStatus(student) {
    const enrollment =
      student.enrollments?.find(
        (item) => item.status === "active"
      ) || student.enrollments?.[0];

    return enrollment?.status || "No enrolment";
  }

  const firstRecord =
    total === 0 ? 0 : page * PAGE_SIZE + 1;

  const lastRecord = Math.min(
    (page + 1) * PAGE_SIZE,
    total
  );

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

        <Link
          className="side-link active"
          to="/admin/students"
        >
          <Users size={18} />
          Students
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
          <span>Management / Students</span>

          <span className="admin-user">
            {user?.full_name || "Administrator"}
          </span>
        </header>

        <section className="dashboard-content">

          {/* Page heading */}
          <div className="page-heading">

            <div>
              <span className="eyebrow">
                STUDENT MANAGEMENT
              </span>

              <h1>Students</h1>

              <p>
                Search and manage your student records.
              </p>
            </div>

            <Link
              className="button button-outline"
              to="/admin"
            >
              <ArrowLeft size={15} />
              Dashboard
            </Link>

          </div>

          {/* Search and filters */}
          <div className="student-toolbar">

            <label className="student-search">
              <Search size={17} />

              <input
                type="text"
                placeholder="Search name, student ID or phone"
                value={search}
                onChange={(event) =>
                  handleFilterChange(
                    setSearch,
                    event.target.value
                  )
                }
              />
            </label>

            <select
              value={classNumber}
              onChange={(event) =>
                handleFilterChange(
                  setClassNumber,
                  event.target.value
                )
              }
            >
              <option value="">All classes</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
              <option value="11">Class 11</option>
              <option value="12">Class 12</option>
            </select>

            <select
              value={stream}
              onChange={(event) =>
                handleFilterChange(
                  setStream,
                  event.target.value
                )
              }
            >
              <option value="">All streams</option>
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
            </select>

            <select
              value={enrollmentStatus}
              onChange={(event) =>
                handleFilterChange(
                  setEnrollmentStatus,
                  event.target.value
                )
              }
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>

          </div>

          {/* Error message */}
          {error && (
            <div className="student-error">
              {error}
            </div>
          )}

          {/* Student table */}
          <div className="student-table-wrap">

            <table className="student-table">

              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Class</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {loading ? (
                  <tr>
                    <td colSpan="5" className="table-message">
                      Loading student records...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="table-message">
                      {error
                        ? "Student records unavailable."
                        : "No students found."}
                    </td>
                  </tr>
                ) : (
                  students.map((student) => {
                    const status = getEnrollmentStatus(student);

                    return (
                      <tr key={student.id}>

                    <td>
                    <Link
                        to={`/admin/students/${student.id}`}
                        className="student-name-link"
                    >
                        {student.full_name}
                    </Link>

                    <small>{student.email || "—"}</small>
                    </td>

                        <td>
                          <span className="student-code">
                            {student.student_code}
                          </span>
                        </td>

                        <td>{getStudentClass(student)}</td>

                        <td>
                          {student.student_phone ||
                            student.mother_phone ||
                            student.father_phone ||
                            "—"}
                        </td>

                        <td>
                          <span
                            className={`status-pill ${
                              status === "active"
                                ? "status-active"
                                : "status-inactive"
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                      </tr>
                    );
                  })
                )}

              </tbody>

            </table>

          </div>

          {/* Pagination */}
          <div className="student-pagination">

            <span>
              Showing {firstRecord}–{lastRecord} of {total} students
            </span>

            <div>

              <button
                className="button button-outline"
                disabled={page === 0 || loading}
                onClick={() =>
                  setPage((current) =>
                    Math.max(0, current - 1)
                  )
                }
              >
                <ChevronLeft size={15} />
                Previous
              </button>

              <button
                className="button button-outline"
                disabled={
                  (page + 1) * PAGE_SIZE >= total || loading
                }
                onClick={() =>
                  setPage((current) => current + 1)
                }
              >
                Next
                <ChevronRight size={15} />
              </button>

            </div>

          </div>

        </section>

      </main>
    </div>
  );
}
