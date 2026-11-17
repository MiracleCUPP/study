import React from "react"
import { BookOpen, CalendarDays, GraduationCap, LifeBuoy } from "lucide-react"
import { Link } from "react-router-dom"

const items = [
  ["/student/schedule", CalendarDays, "Мои занятия", "Расписание, переносы и ссылка на урок"],
  ["/student/homework", BookOpen, "Домашние задания", "Задания и отправка файлов"],
  ["/student/materials", GraduationCap, "Материалы", "Файлы от репетитора"],
  ["/student/support", LifeBuoy, "Поддержка", "Контакты поддержки и репетитора"]
]

export default function Dashboard() {
  return (
    <>
      <section className="hero">
        <div>
          <h1>Категории ученика</h1>
          <p>Только нужные разделы: занятия, задания, материалы и помощь.</p>
        </div>
        <img src="/assets/photos/botanical_leaves.png" alt="" />
      </section>

      <div className="category-grid student-grid">
        {items.map(([path, Icon, title, text]) => (
          <article className="category-card" key={path}>
            <div className="category-icon"><Icon size={24} /></div>
            <h2>{title}</h2>
            <p>{text}</p>
            <Link className="primary-button button-link" to={path}>Открыть →</Link>
          </article>
        ))}
      </div>

      <section className="visual-feature-strip student-visual">
        <div className="visual-feature-copy">
          <span className="eyebrow">Учёба по плану</span>
          <h2>Всё нужное для занятия — в одном месте</h2>
          <p>Смотрите расписание, получайте задания и открывайте материалы репетитора без лишних сервисов.</p>
        </div>
        <img src="/assets/photos/notebook_small_steps.png" alt="Учебные заметки STUDY" />
      </section>
    </>
  )
}
