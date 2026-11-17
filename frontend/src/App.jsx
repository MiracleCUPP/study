import React from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import AppLayout from "./components/AppLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import { useAuth } from "./context/AuthContext"

import LoginPage from "./pages/shared/LoginPage"
import SupportPage from "./pages/shared/SupportPage"

import TutorDashboard from "./pages/tutor/Dashboard"
import TutorStudentsPage from "./pages/tutor/StudentsPage"
import TutorSchedulePage from "./pages/tutor/SchedulePage"
import TutorTransfersPage from "./pages/tutor/TransfersPage"
import TutorHomeworkPage from "./pages/tutor/HomeworkPage"
import TutorMaterialsPage from "./pages/tutor/MaterialsPage"
import TutorStatsPage from "./pages/tutor/StatsPage"
import TutorRequestsPage from "./pages/tutor/RequestsPage"

import StudentDashboard from "./pages/student/Dashboard"
import StudentSchedulePage from "./pages/student/SchedulePage"
import StudentHomeworkPage from "./pages/student/HomeworkPage"
import StudentMaterialsPage from "./pages/student/MaterialsPage"

function HomeRedirect() {
  const { user, loading } = useAuth()

  if (loading) return <div className="center-card">Загрузка...</div>
  if (!user) return <Navigate to="/login" replace />

  return <Navigate to={user.role === "tutor" ? "/tutor" : "/student"} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/tutor"
        element={
          <ProtectedRoute role="tutor">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TutorDashboard />} />
        <Route path="students" element={<TutorStudentsPage />} />
        <Route path="schedule" element={<TutorSchedulePage />} />
        <Route path="transfers" element={<TutorTransfersPage />} />
        <Route path="homework" element={<TutorHomeworkPage />} />
        <Route path="materials" element={<TutorMaterialsPage />} />
        <Route path="stats" element={<TutorStatsPage />} />
        <Route path="requests" element={<TutorRequestsPage />} />
        <Route path="support" element={<SupportPage />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="schedule" element={<StudentSchedulePage />} />
        <Route path="homework" element={<StudentHomeworkPage />} />
        <Route path="materials" element={<StudentMaterialsPage />} />
        <Route path="support" element={<SupportPage />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
