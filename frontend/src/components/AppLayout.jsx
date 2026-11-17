import React, { useState } from "react"
import {
  BarChart3, BookOpen, CalendarDays, ClipboardList, GraduationCap,
  Home, LifeBuoy, Menu, Search, UserPlus, Users, X
} from "lucide-react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import NotificationBell from "./NotificationBell"

const tutorLinks = [
  ["/tutor", "Главная", Home, true],
  ["/tutor/schedule", "Расписание", CalendarDays],
  ["/tutor/students", "Ученики", Users],
  ["/tutor/homework", "Домашние задания", BookOpen],
  ["/tutor/transfers", "Переносы", ClipboardList],
  ["/tutor/materials", "Материалы", GraduationCap],
  ["/tutor/stats", "Статистика", BarChart3],
  ["/tutor/requests", "Демо-заявки", UserPlus],
  ["/tutor/support", "Поддержка", LifeBuoy]
]

const studentLinks = [
  ["/student", "Главная", Home, true],
  ["/student/schedule", "Мои занятия", CalendarDays],
  ["/student/homework", "Домашние задания", BookOpen],
  ["/student/materials", "Материалы", GraduationCap],
  ["/student/support", "Поддержка", LifeBuoy]
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState("")
  const links = user.role === "tutor" ? tutorLinks : studentLinks

  function submitSearch(event) {
    event.preventDefault()
    const query = search.trim().toLowerCase()
    if (!query) return

    const item = links.find(([, label]) => label.toLowerCase().includes(query))
    if (item) {
      navigate(item[0])
      setSearch("")
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand-wrap">
            <img className="sidebar-logo" src="/assets/logo/study_wordmark.svg" alt="STUDY" />
            <div className="brand-sub">Больше, чем знания</div>
          </div>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)}>
            <X />
          </button>
        </div>

        <nav className="nav-list">
          {links.map(([path, label, Icon, exact]) => (
            <NavLink
              key={path}
              to={path}
              end={Boolean(exact)}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-quote">
            <div className="sidebar-quote-title">
              {user.role === "tutor" ? "Ваш вклад меняет будущее" : "Маленькие шаги каждый день"}
            </div>
            <p>
              {user.role === "tutor"
                ? "Помогайте ученикам расти и становиться увереннее."
                : "Регулярность приводит к большим результатам."}
            </p>
          </div>

          <button className="logout-button" onClick={logout}>Выйти из аккаунта</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)}>
            <Menu />
          </button>

          <form className="top-search" onSubmit={submitSearch}>
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Поиск по разделам..."
            />
          </form>

          <div className="topbar-actions">
            <NotificationBell />

            <div className="profile-chip">
              <span className="profile-avatar">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </span>
              <div>
                <strong>{user.firstName} {user.lastName}</strong>
                <small>{user.role === "tutor" ? "Репетитор" : `${user.grade} класс`}</small>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
