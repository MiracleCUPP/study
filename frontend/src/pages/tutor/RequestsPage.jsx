import React, { useEffect, useState } from "react"
import { api } from "../../api/client"

export default function RequestsPage() {
  const [items, setItems] = useState([])
  const [error, setError] = useState("")

  async function load() {
    try {
      setItems(await api.demoRequests())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [])

  async function changeStatus(item, status) {
    await api.updateDemoRequest(item.id, status)
    await load()
  }

  return (
    <>
      <div className="page-heading">
        <h1>Заявки на демо-занятие</h1>
        <p>Заявки с экрана входа появляются здесь автоматически.</p>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="records-grid">
        {items.map(item => (
          <article className="record-card" key={item.id}>
            <span className={`badge ${item.status}`}>{item.status === "new" ? "Новая" : item.status}</span>
            <h3>{item.firstName} {item.lastName}</h3>
            <p>{item.grade} класс</p>
            <p><strong>Контакт:</strong> {item.contact}</p>
            <p>{new Date(item.createdAt).toLocaleString("ru-RU")}</p>

            <div className="card-actions">
              <button className="primary-button small-button" onClick={() => changeStatus(item, "contacted")}>Связались</button>
              <button className="outline-button small-button" onClick={() => changeStatus(item, "archived")}>В архив</button>
            </div>
          </article>
        ))}
        {!items.length && <div className="empty-state">Заявок пока нет.</div>}
      </div>
    </>
  )
}
