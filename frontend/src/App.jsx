import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import PublicHome from "./pages/public/PublicHome";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import Students from "./pages/admin/Students";
import StudentProfile from "./pages/admin/StudentProfile";
import AdmissionForm from "./pages/admin/AdmissionForm";
import Teachers from "./pages/admin/Teachers";
import Batches from "./pages/admin/Batches";
import OnlineClass from "./pages/admin/OnlineClass";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="screen-message">Loading...</div>;
  }

  return user ? children : <Navigate to="/admin/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />

      <Route path="/admin/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/students"
        element={
          <ProtectedRoute>
            <Students />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students/:studentId"
        element={
          <ProtectedRoute>
            <StudentProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/admissions/new"
        element={
          <ProtectedRoute>
            <AdmissionForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/teachers"
        element={
          <ProtectedRoute>
            <Teachers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/batches"
        element={
          <ProtectedRoute>
            <Batches />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/online-class"
        element={
          <ProtectedRoute>
            <OnlineClass />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}