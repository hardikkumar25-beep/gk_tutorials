import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Pencil,
  Save,
  X,
  Ban,
  LogOut,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const emptySchedule = () => ({
  day_of_week: 0,
  start_time: "16:00",
  end_time: "17:00",
});

const emptyForm = {
  name: "",
  class_number: "9",
  stream: "",
  academic_session_id: "",
  teacher_id: "",
  capacity: "30",
  batch_subjects: [],
};

function getErrorMessage(err, fallback) {
  const detail = err.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg || "Invalid input")
      .join(". ");
  }

  return fallback;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function formatTime(time) {
  return time ? String(time).slice(0, 5) : "";
}

function formatSchedule(schedules = []) {
  if (!schedules.length) return "No schedule";

  return schedules
    .map(
      (schedule) =>
        `${DAYS[schedule.day_of_week]} ${formatTime(
          schedule.start_time
        )}–${formatTime(schedule.end_time)}`
    )
    .join(", ");
}

function getSubjectLabel(subject) {
  return subject.subject_name || subject.name || `Subject ${subject.id}`;
}

export default function Batches() {
  const { user, logout } = useAuth();

  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [classFilter, setClassFilter] = useState("");
  const [streamFilter, setStreamFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deactivatingId, setDeactivatingId] = useState(null);

  async function loadBatches() {
    setLoading(true);
    setError("");

    try {
      const params = { is_active: true };

      if (classFilter) {
        params.class_number = Number(classFilter);
      }

      if (streamFilter) {
        params.stream = streamFilter;
      }

      const response = await api.get("/batches", { params });
      setBatches(normalizeList(response.data));
    } catch (err) {
      setBatches([]);
      setError(
        getErrorMessage(err, "Unable to load batches.")
      );
    } finally {
      setLoading(false);
    }
  }

async function loadFormOptions(isEditing = false, existingSessionId = null) {
  try {
    const [teacherResponse, sessionResponse] = await Promise.all([
      api.get("/teachers", {
        params: { is_active: true },
      }),
      api.get("/academic-sessions/current"),
    ]);

    setTeachers(normalizeList(teacherResponse.data));

    const currentSession = sessionResponse.data;
    setSessions(currentSession ? [currentSession] : []);

    if (!isEditing && currentSession?.id) {
      setForm((previous) => ({
        ...previous,
        academic_session_id: String(currentSession.id),
      }));
    }

    if (
      isEditing &&
      existingSessionId &&
      currentSession?.id !== existingSessionId
    ) {
      setSessions((previous) => [
        ...previous,
        {
          id: existingSessionId,
          name: `Existing session #${existingSessionId}`,
        },
      ]);
    }
  } catch (err) {
    setSessions([]);
    setSaveError(
      getErrorMessage(
        err,
        "Unable to load teachers or current academic session."
      )
    );
  }
}

  useEffect(() => {
    loadBatches();
  }, [classFilter, streamFilter]);

  async function loadSubjects(classNumber, stream) {
    setSubjectsLoading(true);
    setAvailableSubjects([]);

    try {
      const params = {
        class_number: Number(classNumber),
        is_active: true,
      };

      if (Number(classNumber) >= 11 && stream) {
        params.stream = stream;
      }

      const response = await api.get("/subjects", { params });
      setAvailableSubjects(normalizeList(response.data));
    } catch (err) {
      setSaveError(
        getErrorMessage(err, "Unable to load subjects for this class.")
      );
    } finally {
      setSubjectsLoading(false);
    }
  }

  async function openAddForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      academic_session_id:
        sessions.find((session) => session.is_current)?.id?.toString() ||
        "",
    });
    setSaveError("");
    setSuccess("");
    setFormOpen(true);

    await loadFormOptions(false);
    await loadSubjects(9, "");
  }

  async function openEditForm(batch) {
    setEditingId(batch.id);
    setSaveError("");
    setSuccess("");
    setFormOpen(true);

    await loadFormOptions(true, batch.academic_session_id);
    await loadSubjects(batch.class_number, batch.stream || "");

    try {
      const response = await api.get(`/batches/${batch.id}`);
      const data = response.data;

      setForm({
        name: data.name || "",
        class_number: String(data.class_number),
        stream: data.stream || "",
        academic_session_id: String(data.academic_session_id),
        teacher_id: data.teacher_id ? String(data.teacher_id) : "",
        capacity: String(data.capacity),
        batch_subjects: (data.batch_subjects || []).map((item) => ({
          subject_id: String(item.subject_id),
          schedules: (item.schedules || []).map((schedule) => ({
            day_of_week: Number(schedule.day_of_week),
            start_time: formatTime(schedule.start_time),
            end_time: formatTime(schedule.end_time),
          })),
        })),
      });
    } catch (err) {
      setSaveError(
        getErrorMessage(err, "Unable to load this batch.")
      );
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setAvailableSubjects([]);
    setSaveError("");
  }

  async function handleClassChange(value) {
    setForm((previous) => ({
      ...previous,
      class_number: value,
      stream: "",
      batch_subjects: [],
    }));

    if (Number(value) <= 10) {
      await loadSubjects(value, "");
    } else {
      setAvailableSubjects([]);
    }
  }

  async function handleStreamChange(value) {
    setForm((previous) => ({
      ...previous,
      stream: value,
      batch_subjects: [],
    }));

    if (value) {
      await loadSubjects(form.class_number, value);
    }
  }

  function addSubject(subjectId) {
    if (!subjectId) return;

    if (
      form.batch_subjects.some(
        (item) => item.subject_id === String(subjectId)
      )
    ) {
      setSaveError("This subject has already been added.");
      return;
    }

    setSaveError("");

    setForm((previous) => ({
      ...previous,
      batch_subjects: [
        ...previous.batch_subjects,
        {
          subject_id: String(subjectId),
          schedules: [emptySchedule()],
        },
      ],
    }));
  }

  function removeSubject(subjectId) {
    setForm((previous) => ({
      ...previous,
      batch_subjects: previous.batch_subjects.filter(
        (item) => item.subject_id !== subjectId
      ),
    }));
  }

  function addSchedule(subjectId) {
    setForm((previous) => ({
      ...previous,
      batch_subjects: previous.batch_subjects.map((item) =>
        item.subject_id === subjectId
          ? {
              ...item,
              schedules: [...item.schedules, emptySchedule()],
            }
          : item
      ),
    }));
  }

  function updateSchedule(subjectId, index, field, value) {
    setForm((previous) => ({
      ...previous,
      batch_subjects: previous.batch_subjects.map((item) =>
        item.subject_id === subjectId
          ? {
              ...item,
              schedules: item.schedules.map((schedule, scheduleIndex) =>
                scheduleIndex === index
                  ? { ...schedule, [field]: value }
                  : schedule
              ),
            }
          : item
      ),
    }));
  }

  function removeSchedule(subjectId, index) {
    setForm((previous) => ({
      ...previous,
      batch_subjects: previous.batch_subjects.map((item) =>
        item.subject_id === subjectId
          ? {
              ...item,
              schedules: item.schedules.filter(
                (_, scheduleIndex) => scheduleIndex !== index
              ),
            }
          : item
      ),
    }));
  }

  function validateForm() {
    if (!form.name.trim()) return "Enter a batch name.";

    if (!form.academic_session_id) {
      return "Select an academic session.";
    }

    if (
      Number(form.class_number) >= 11 &&
      !form.stream
    ) {
      return "Select a stream for Class 11 or 12.";
    }

    if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1) {
      return "Capacity must be a positive whole number.";
    }

    if (form.batch_subjects.length === 0) {
      return "Add at least one subject to this batch.";
    }

    for (const subject of form.batch_subjects) {
      if (subject.schedules.length === 0) {
        return "Every subject must have at least one schedule.";
      }

      for (const schedule of subject.schedules) {
        if (!schedule.start_time || !schedule.end_time) {
          return "Enter a start and end time for every schedule.";
        }

        if (schedule.end_time <= schedule.start_time) {
          return "Schedule end time must be after its start time.";
        }
      }
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setSaveError(validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      class_number: Number(form.class_number),
      stream: Number(form.class_number) <= 10 ? null : form.stream,
      academic_session_id: Number(form.academic_session_id),
      teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
      capacity: Number(form.capacity),
      batch_subjects: form.batch_subjects.map((item) => ({
        subject_id: Number(item.subject_id),
        schedules: item.schedules.map((schedule) => ({
          day_of_week: Number(schedule.day_of_week),
          start_time: schedule.start_time,
          end_time: schedule.end_time,
        })),
      })),
    };

    setSaving(true);
    setSaveError("");
    setSuccess("");

    try {
      if (editingId !== null) {
        await api.patch(`/batches/${editingId}`, payload);
        setSuccess("Batch updated successfully.");
      } else {
        await api.post("/batches", payload);
        setSuccess("Batch created successfully.");
      }

      closeForm();
      await loadBatches();
    } catch (err) {
      setSaveError(
        getErrorMessage(err, "Unable to save this batch.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(batch) {
    const confirmed = window.confirm(
      `Deactivate batch "${batch.name}"? This will preserve its record but remove it from the active batch list.`
    );

    if (!confirmed) return;

    setDeactivatingId(batch.id);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/batches/${batch.id}/deactivate`);

      setBatches((previous) =>
        previous.filter((item) => item.id !== batch.id)
      );

      setSuccess(`Batch "${batch.name}" has been deactivated.`);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to deactivate this batch.")
      );
    } finally {
      setDeactivatingId(null);
    }
  }

  function getBatchSubjects(batch) {
    return (batch.batch_subjects || [])
      .map((item) => getSubjectLabel(item.subject || {}))
      .join(", ") || "—";
  }

  function getTeacherName(batch) {
    return batch.teacher?.name || "Unassigned";
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

        <Link className="side-link" to="/admin/teachers">
          <Users size={18} />
          Teachers
        </Link>

        <Link className="side-link active" to="/admin/batches">
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
          <span>Management / Batches</span>
          <span className="admin-user">
            {user?.full_name || "Administrator"}
          </span>
        </header>

        <section className="dashboard-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">BATCH MANAGEMENT</span>
              <h1>Batches</h1>
              <p>Organise classes, teachers, subjects and schedules.</p>
            </div>

            <div className="student-heading-actions">
              <Link className="button button-outline" to="/admin">
                <ArrowLeft size={15} />
                Dashboard
              </Link>

              <button
                className="button button-primary"
                onClick={openAddForm}
              >
                <Plus size={16} />
                Create Batch
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
              <div className="profile-card-heading profile-edit-heading">
                <div>
                  <BookOpen size={19} />
                  <h2>
                    {editingId !== null ? "Edit Batch" : "Create Batch"}
                  </h2>
                </div>

                <button
                  type="button"
                  className="button button-outline"
                  onClick={closeForm}
                  disabled={saving}
                >
                  <X size={15} />
                  Close
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="profile-form-grid">
                  <label className="profile-form-field">
                    <span>Batch Name *</span>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g. Class 9 MWF"
                      maxLength={100}
                      required
                    />
                  </label>

                  <label className="profile-form-field">
                    <span>Class *</span>
                    <select
                      value={form.class_number}
                      onChange={(event) =>
                        handleClassChange(event.target.value)
                      }
                    >
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                    </select>
                  </label>

                  {Number(form.class_number) >= 11 && (
                    <label className="profile-form-field">
                      <span>Stream *</span>
                      <select
                        value={form.stream}
                        onChange={(event) =>
                          handleStreamChange(event.target.value)
                        }
                        required
                      >
                        <option value="">Select stream</option>
                        <option value="Science">Science</option>
                        <option value="Commerce">Commerce</option>
                      </select>
                    </label>
                  )}

                  <label className="profile-form-field">
                    <span>Academic Session *</span>
                    <select
                    value={form.academic_session_id}
                    onChange={(event) =>
                        setForm((previous) => ({
                        ...previous,
                        academic_session_id: event.target.value,
                        }))
                    }
                    required
                    >
                    <option value="">Select session</option>

                    {sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                        {session.name}
                        {session.is_current ? " (Current)" : ""}
                        </option>
                    ))}
                    </select>
                  </label>

                  <label className="profile-form-field">
                    <span>Teacher</span>
                    <select
                      value={form.teacher_id}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          teacher_id: event.target.value,
                        }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="profile-form-field">
                    <span>Batch Capacity *</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.capacity}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          capacity: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                </div>

                <div className="profile-card-heading" style={{ marginTop: 28 }}>
                  <BookOpen size={19} />
                  <h2>Subjects & Schedules</h2>
                </div>

                <div className="profile-form-grid">
                  <label className="profile-form-field">
                    <span>Add Subject</span>
                    <select
                      value=""
                      disabled={
                        subjectsLoading ||
                        (Number(form.class_number) >= 11 && !form.stream)
                      }
                      onChange={(event) => addSubject(event.target.value)}
                    >
                      <option value="">
                        {subjectsLoading
                          ? "Loading subjects..."
                          : "Select a subject"}
                      </option>

                      {availableSubjects
                        .filter(
                          (subject) =>
                            !form.batch_subjects.some(
                              (item) =>
                                item.subject_id === String(subject.id)
                            )
                        )
                        .map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {getSubjectLabel(subject)}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                {form.batch_subjects.length === 0 ? (
                  <p className="profile-empty">
                    No subjects added yet. Select a subject above.
                  </p>
                ) : (
                  <div className="enrollment-list">
                    {form.batch_subjects.map((item) => {
                      const subject = availableSubjects.find(
                        (candidate) =>
                          String(candidate.id) === item.subject_id
                      );

                      const subjectName = subject
                        ? getSubjectLabel(subject)
                        : `Subject ${item.subject_id}`;

                      return (
                        <div
                          className="enrollment-card"
                          key={item.subject_id}
                        >
                          <div className="enrollment-heading">
                            <div>
                              <h3>{subjectName}</h3>
                              <span>
                                {item.schedules.length} schedule
                                {item.schedules.length === 1 ? "" : "s"}
                              </span>
                            </div>

                            <button
                              type="button"
                              className="button button-danger-outline"
                              onClick={() =>
                                removeSubject(item.subject_id)
                              }
                            >
                              <Trash2 size={14} />
                              Remove Subject
                            </button>
                          </div>

                          {item.schedules.map((schedule, index) => (
                            <div
                              className="profile-form-grid"
                              key={`${item.subject_id}-${index}`}
                              style={{
                                alignItems: "end",
                                marginTop: 14,
                              }}
                            >
                              <label className="profile-form-field">
                                <span>Day</span>
                                <select
                                  value={schedule.day_of_week}
                                  onChange={(event) =>
                                    updateSchedule(
                                      item.subject_id,
                                      index,
                                      "day_of_week",
                                      event.target.value
                                    )
                                  }
                                >
                                  {DAYS.map((day, dayIndex) => (
                                    <option
                                      key={day}
                                      value={dayIndex}
                                    >
                                      {day}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="profile-form-field">
                                <span>Start Time</span>
                                <input
                                  type="time"
                                  value={schedule.start_time}
                                  onChange={(event) =>
                                    updateSchedule(
                                      item.subject_id,
                                      index,
                                      "start_time",
                                      event.target.value
                                    )
                                  }
                                  required
                                />
                              </label>

                              <label className="profile-form-field">
                                <span>End Time</span>
                                <input
                                  type="time"
                                  value={schedule.end_time}
                                  onChange={(event) =>
                                    updateSchedule(
                                      item.subject_id,
                                      index,
                                      "end_time",
                                      event.target.value
                                    )
                                  }
                                  required
                                />
                              </label>

                              <button
                                type="button"
                                className="button button-danger-outline"
                                onClick={() =>
                                  removeSchedule(item.subject_id, index)
                                }
                                disabled={item.schedules.length === 1}
                              >
                                <Trash2 size={14} />
                                Remove
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            className="button button-outline"
                            style={{ marginTop: 14 }}
                            onClick={() => addSchedule(item.subject_id)}
                          >
                            <Plus size={14} />
                            Add Time Slot
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

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
                    disabled={saving || subjectsLoading}
                  >
                    <Save size={15} />
                    {saving
                      ? "Saving..."
                      : editingId !== null
                        ? "Save Changes"
                        : "Create Batch"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="student-toolbar">
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
            >
              <option value="">All classes</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
              <option value="11">Class 11</option>
              <option value="12">Class 12</option>
            </select>

            <select
              value={streamFilter}
              onChange={(event) => setStreamFilter(event.target.value)}
            >
              <option value="">All streams</option>
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
            </select>

            <button
              className="button button-outline"
              onClick={loadBatches}
              disabled={loading}
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <strong>
              {batches.length} active{" "}
              {batches.length === 1 ? "batch" : "batches"}
            </strong>
          </div>

          <div className="student-table-wrap">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Class</th>
                  <th>Subjects</th>
                  <th>Teacher</th>
                  <th>Capacity</th>
                  <th>Session</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="table-message">
                      Loading batches...
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="table-message">
                      No active batches found.
                    </td>
                  </tr>
                ) : (
                  batches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <strong>{batch.name}</strong>
                      </td>

                      <td>
                        Class {batch.class_number}
                        {batch.stream ? ` · ${batch.stream}` : ""}
                      </td>

                      <td>{getBatchSubjects(batch)}</td>

                      <td>{getTeacherName(batch)}</td>

                      <td>{batch.capacity}</td>

                      <td>
                        {batch.academic_session?.name ||
                          batch.academic_session_id ||
                          "—"}
                      </td>

                      <td>
                        <div className="student-heading-actions">
                          <button
                            className="button button-outline"
                            onClick={() => openEditForm(batch)}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            className="button button-danger-outline"
                            onClick={() => handleDeactivate(batch)}
                            disabled={deactivatingId === batch.id}
                          >
                            <Ban size={14} />
                            {deactivatingId === batch.id
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