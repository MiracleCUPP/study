import React, { useEffect, useMemo, useState } from "react"
import { api } from "../../api/client"
import Modal from "../../components/Modal"
import { useAuth } from "../../context/AuthContext"
import { formatInTimezone, timeInTimezone } from "../../utils/timezones"

const STATUS_LABELS = {
  planned: "По плану",
  completed: "Проведено",
  transferred: "Перенесено",
  cancelled: "Отменено",
  no_show: "Пропуск"
}

function localDateKey(value, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value))
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}`
}

export default function SchedulePage() {
  const { user } = useAuth()
  const timezone = user?.timezone || "Asia/Novosibirsk"
  const [lessons, setLessons] = useState([])
  const [transfers, setTransfers] = useState([])
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState("")
  const [transferDate, setTransferDate] = useState("")
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState("")
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState("")

  async function load() {
    try {
      const [lessonData, transferData] = await Promise.all([api.lessons(), api.transfers()])
      setLessons(lessonData)
      setTransfers(transferData)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [])

  const upcoming = useMemo(
    () => lessons.filter(item => new Date(item.startAt) >= new Date(Date.now() - 6 * 60 * 60 * 1000)).sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
    [lessons]
  )

  async function loadSlots(date, lesson = selected) {
    setTransferDate(date)
    setSlots([])
    setSelectedSlot("")
    if (!date || !lesson) return
    setLoadingSlots(true)
    setError("")
    try {
      const result = await api.freeSlots(date, lesson.durationMinutes, lesson.id)
      setSlots(result.slots || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingSlots(false)
    }
  }

  function openTransfer(lesson) {
    setSelected(lesson)
    setReason("")
    setSlots([])
    setSelectedSlot("")
    setError("")
    const key = localDateKey(lesson.startAt, timezone)
    setTransferDate(key)
    setTimeout(() => loadSlots(key, lesson), 0)
  }

  async function submitTransfer(event) {
    event.preventDefault()
    if (!selectedSlot) {
      setError("Выберите свободное время")
      return
    }
    try {
      await api.createTransfer({
        lessonId: selected.id,
        reason,
        requestedStartAt: selectedSlot
      })
      setSelected(null)
      setReason("")
      setTransferDate("")
      setSlots([])
      setSelectedSlot("")
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="page-heading">
        <h1>Мои занятия</h1>
        <p>Все даты показаны по вашему местному времени: <strong>{user?.city || "ваш город"}</strong> · {timezone}. Ссылка на занятие появляется за 5 минут.</p>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="student-schedule-list">
        {upcoming.map(lesson => (
          <article className={`student-lesson-row ${lesson.status}`} key={lesson.id}>
            <div className="student-lesson-date">
              <strong>{formatInTimezone(lesson.startAt, timezone, { weekday: "short" })}</strong>
              {lesson.status === "transferred" && lesson.originalStartAt && (
                <small>Было: {formatInTimezone(lesson.originalStartAt, timezone)}</small>
              )}
            </div>
            <div className="student-lesson-main">
              <span className={`badge ${lesson.status}`}>{STATUS_LABELS[lesson.status] || lesson.status}</span>
              <h3>{lesson.subject}</h3>
              <p>{lesson.topic || "Тема будет указана репетитором"}</p>
              {lesson.status === "transferred" && <p className="transfer-highlight">Новое время: {formatInTimezone(lesson.startAt, timezone)}</p>}
            </div>
            <div className="student-lesson-actions">
              {lesson.meetingAvailable && lesson.meetingLink ? (
                <a className="primary-button small-button" href={lesson.meetingLink} target="_blank" rel="noreferrer">Войти на занятие</a>
              ) : (
                <span className="link-locked">Ссылка откроется за 5 минут</span>
              )}
              {["planned", "transferred"].includes(lesson.status) && (
                <button className="outline-button small-button" onClick={() => openTransfer(lesson)}>Запросить перенос</button>
              )}
            </div>
          </article>
        ))}
        {!upcoming.length && <div className="empty-state">Занятий пока нет.</div>}
      </div>

      <section className="section-panel">
        <h2>Мои запросы на перенос</h2>
        {transfers.map(item => (
          <div className="request-line" key={item.id}>
            <div>
              <strong>{formatInTimezone(item.requestedStartAt, timezone)}</strong>
              <span>{item.reason}</span>
            </div>
            <span className={`badge ${item.status}`}>{item.status === "new" ? "Ожидает решения" : item.status === "approved" ? "Подтверждено" : "Отклонено"}</span>
          </div>
        ))}
        {!transfers.length && <p className="muted">Запросов пока нет.</p>}
      </section>

      {selected && (
        <Modal title="Запросить перенос" onClose={() => setSelected(null)}>
          <form className="form" onSubmit={submitTransfer}>
            <div className="transfer-current-time">
              <span>Текущее занятие</span>
              <strong>{formatInTimezone(selected.startAt, timezone)}</strong>
            </div>

            <label>Причина<textarea value={reason} onChange={event => setReason(event.target.value)} required /></label>

            <label>
              Выберите дату
              <input type="date" value={transferDate} onChange={event => loadSlots(event.target.value)} required />
            </label>

            <div>
              <div className="slot-title">Свободное время</div>
              {loadingSlots && <p className="muted">Проверяем календарь...</p>}
              {!loadingSlots && transferDate && !slots.length && <p className="form-error">На эту дату свободных интервалов нет.</p>}
              <div className="free-slot-grid">
                {slots.map(slot => (
                  <button
                    type="button"
                    key={slot.startAt}
                    className={selectedSlot === slot.startAt ? "selected" : ""}
                    onClick={() => setSelectedSlot(slot.startAt)}
                  >
                    <strong>{slot.viewerLabel}</strong>
                    <small>у репетитора {slot.tutorLabel}</small>
                  </button>
                ))}
              </div>
            </div>

            {selectedSlot && <p className="form-success">Выбрано: {formatInTimezone(selectedSlot, timezone)} по вашему времени.</p>}
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" disabled={!selectedSlot}>Отправить запрос</button>
          </form>
        </Modal>
      )}
    </>
  )
}
