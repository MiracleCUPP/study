import React, { useEffect, useState } from "react"
import { api } from "../../api/client"

export default function StatsPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.stats().then(setData)
  }, [])

  if (!data) return <div className="empty-state">Загрузка статистики...</div>

  const periods = [
    ["За неделю", data.week],
    ["За месяц", data.month],
    ["За год", data.year]
  ]

  return (
    <>
      <div className="page-heading">
        <h1>Статистика</h1>
        <p>Учитываются только занятия со статусом «Проведено».</p>
      </div>

      <div className="stats-grid">
        {periods.map(([title, item]) => (
          <article className="stat-card" key={title}>
            <span>{title}</span>
            <strong>{item.lessons}</strong>
            <small>занятий</small>
            <b>{item.revenueRub.toLocaleString("ru-RU")} ₽</b>
          </article>
        ))}
      </div>

      <section className="table-card stats-table-card">
        <h2>Стоимость занятия по ученикам</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ученик</th>
              <th>Класс</th>
              <th>Стоимость занятия</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map(student => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>{student.grade}</td>
                <td>{student.lessonPriceRub.toLocaleString("ru-RU")} ₽</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
