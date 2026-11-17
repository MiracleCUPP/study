import React from "react"
import { BarChart3, BookOpen, CalendarDays, ClipboardList, GraduationCap, UserPlus, Users } from "lucide-react"
import { Link } from "react-router-dom"

const items = [
  ["/tutor/schedule", CalendarDays, "Расписание", "Занятия, ссылки и изменение времени"],
  ["/tutor/students", Users, "Ученики", "Создание аккаунтов и стоимость занятия"],
  ["/tutor/homework", BookOpen, "Домашние задания", "Выдача и проверка работ"],
  ["/tutor/transfers", ClipboardList, "Переносы", "Запросы учеников на другое время"],
  ["/tutor/materials", GraduationCap, "Материалы", "Файлы для всех, класса или ученика"],
  ["/tutor/stats", BarChart3, "Статистика", "Занятия и доход за неделю, месяц и год"],
  ["/tutor/requests", UserPlus, "Демо-заявки", "Новые обращения с формы на входе"]
]

export default function Dashboard() {
  return (
    <>
      <section className="hero">
        <div>
          <h1>Категории репетитора</h1>
          <p>Все рабочие разделы собраны по категориям, без перегруженной главной страницы.</p>
        </div>
        <img src="/assets/photos/botanical_leaves.png" alt="" />
      </section>

      <div className="category-grid">
        {items.map(([path, Icon, title, text]) => (
          <article className="category-card" key={path}>
            <div className="category-icon"><Icon size={24} /></div>
            <h2>{title}</h2>
            <p>{text}</p>
            <Link className="primary-button button-link" to={path}>Открыть →</Link>
          </article>
        ))}
      </div>

      <section className="specialization-strip">
        <strong>Алгебра и геометрия</strong>
        <span>5–9 классы</span>
        <span>Индивидуально</span>
        <span>Мини-группы</span>
        <span>ВПР · МЦКО · ОГЭ</span>
      </section>

      <section className="visual-feature-strip">
        <div className="visual-feature-copy">
          <span className="eyebrow">STUDY</span>
          <h2>Рабочее пространство без перегрузки</h2>
          <p>Расписание, ученики, домашние задания и материалы собраны в одном спокойном интерфейсе.</p>
        </div>
        <img src="/assets/photos/workspace_laptop.png" alt="Рабочее пространство для онлайн-занятий" />
      </section>
    </>
  )
}
