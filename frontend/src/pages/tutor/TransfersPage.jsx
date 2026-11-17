import React, { useEffect, useState } from "react"
import { api } from "../../api/client"
import { useAuth } from "../../context/AuthContext"
import { formatInTimezone } from "../../utils/timezones"

export default function TransfersPage() {
  const { user } = useAuth()
  const tutorTimezone = user?.timezone || "Asia/Novosibirsk"
  const [items, setItems] = useState([])
  const [error, setError] = useState("")

  async function load() {
    try {
      setItems(await api.transfers())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { load() }, [])

  async function resolve(item, status) {
    const tutorComment = prompt("Комментарий ученику (необязательно)") || ""
    try {
      await api.resolveTransfer(item.id, { status, tutorComment })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="page-heading">
        <h1>Запросы на перенос</h1>
        <p>Показываем одновременно ваше время и местное время ученика.</p>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="records-grid">
        {items.map(item => (
          <article className="record-card" key={item.id}>
            <span className={`badge ${item.status}`}>{item.status === "new" ? "Новый запрос" : item.status === "approved" ? "Подтвержден" : "Отклонен"}</span>
            <h3>{item.studentName}</h3>
            <p><strong>Причина:</strong> {item.reason}</p>
            <p><strong>Было:</strong> {formatInTimezone(item.originalStartAt, tutorTimezone)} по вашему времени</p>
            <p><strong>Предлагает:</strong> {formatInTimezone(item.requestedStartAt, tutorTimezone)} по вашему времени</p>
            {item.studentTimezone && item.studentTimezone !== tutorTimezone && (
              <p><strong>У ученика:</strong> {formatInTimezone(item.requestedStartAt, item.studentTimezone)} · {item.studentTimezone}</p>
            )}
            {item.tutorComment && <p><strong>Комментарий:</strong> {item.tutorComment}</p>}

            {item.status === "new" && (
              <div className="card-actions">
                <button className="primary-button small-button" onClick={() => resolve(item, "approved")}>Подтвердить</button>
                <button className="outline-button small-button" onClick={() => resolve(item, "rejected")}>Отклонить</button>
              </div>
            )}
          </article>
        ))}
        {!items.length && <div className="empty-state">Запросов на перенос пока нет.</div>}
      </div>
    </>
  )
}
