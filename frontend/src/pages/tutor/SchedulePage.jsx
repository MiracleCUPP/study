import React, { useEffect, useMemo, useState } from "react"
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, List, Pencil, Plus, Repeat2, X } from "lucide-react"
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

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

const emptyLesson = {
  studentId: "",
  subject: "Алгебра",
  topic: "",
  localDate: "",
  localTime: "17:00",
  durationMinutes: "60",
  meetingLink: "",
  status: "planned",
  transferNote: ""
}

const emptyRecurring = {
  studentId: "",
  subject: "Алгебра",
  topic: "",
  weekday: "0",
  localTime: "17:00",
  durationMinutes: "60",
  meetingLink: "",
  startDate: "",
  endDate: ""
}

function ymdFromDate(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(key, amount) {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + amount)
  return ymdFromDate(d)
}

function startOfWeek(key) {
  const d = new Date(`${key}T12:00:00Z`)
  const jsDay = d.getUTCDay()
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
  d.setUTCDate(d.getUTCDate() + mondayOffset)
  return ymdFromDate(d)
}

function dateKeyInTimezone(value, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value))
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}`
}

function todayKey(timezone) {
  return dateKeyInTimezone(new Date(), timezone)
}

function monthLabel(key) {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${key.slice(0, 7)}-01T12:00:00Z`))
}

function prettyDay(key) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${key}T12:00:00Z`))
}

function mondayMonthGrid(anchor) {
  const monthStart = `${anchor.slice(0, 7)}-01`
  const first = startOfWeek(monthStart)
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

export default function SchedulePage() {
  const { user } = useAuth()
  const tutorTimezone = user?.timezone || "Asia/Novosibirsk"
  const [lessons, setLessons] = useState([])
  const [students, setStudents] = useState([])
  const [recurring, setRecurring] = useState([])
  const [view, setView] = useState("week")
  const [anchor, setAnchor] = useState(() => todayKey(tutorTimezone))
  const [lessonOpen, setLessonOpen] = useState(false)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState(null)
  const [listFilter, setListFilter] = useState("all")
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyLesson)
  const [repeatForm, setRepeatForm] = useState(emptyRecurring)
  const [error, setError] = useState("")
  const [timePreview, setTimePreview] = useState(null)

  async function load() {
    try {
      const [lessonData, studentData, recurringData] = await Promise.all([
        api.lessons(), api.students(), api.recurringSchedules()
      ])
      setLessons(lessonData)
      setStudents(studentData)
      setRecurring(recurringData)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { load() }, [])


  useEffect(() => {
    const studentId = form.studentId
    if (!studentId || !form.localDate || !form.localTime || !lessonOpen) {
      setTimePreview(null)
      return
    }
    const timer = setTimeout(() => {
      api.timePreview(studentId, form.localDate, form.localTime)
        .then(setTimePreview)
        .catch(() => setTimePreview(null))
    }, 180)
    return () => clearTimeout(timer)
  }, [form.studentId, form.localDate, form.localTime, lessonOpen])

  const byDate = useMemo(() => {
    const map = new Map()
    for (const lesson of lessons) {
      const key = dateKeyInTimezone(lesson.startAt, tutorTimezone)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(lesson)
    }
    for (const items of map.values()) {
      items.sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
    }
    return map
  }, [lessons, tutorTimezone])

  const weekStart = startOfWeek(anchor)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const monthDays = mondayMonthGrid(anchor)

  function studentFor(id) {
    return students.find(item => String(item.id) === String(id))
  }

  function openCreate(dateKey = anchor) {
    const firstStudent = students[0]
    setEditing(null)
    setError("")
    setForm({ ...emptyLesson, studentId: firstStudent ? String(firstStudent.id) : "", localDate: dateKey })
    setLessonOpen(true)
  }

  function openEdit(lesson) {
    setEditing(lesson)
    setError("")
    setForm({
      studentId: String(lesson.studentId),
      subject: lesson.subject,
      topic: lesson.topic || "",
      localDate: dateKeyInTimezone(lesson.startAt, tutorTimezone),
      localTime: timeInTimezone(lesson.startAt, tutorTimezone),
      durationMinutes: String(lesson.durationMinutes),
      meetingLink: lesson.meetingLink || "",
      status: lesson.status || "planned",
      transferNote: lesson.transferNote || ""
    })
    setLessonOpen(true)
  }

  function openRecurring() {
    const firstStudent = students[0]
    setEditingRecurring(null)
    setError("")
    setRepeatForm({
      ...emptyRecurring,
      studentId: firstStudent ? String(firstStudent.id) : "",
      startDate: todayKey(tutorTimezone)
    })
    setRecurringOpen(true)
  }


  function editRecurringRule(rule) {
    setEditingRecurring(rule)
    setError("")
    setRepeatForm({
      studentId: String(rule.studentId),
      subject: rule.subject,
      topic: rule.topic || "",
      weekday: String(rule.weekday),
      localTime: rule.localTime,
      durationMinutes: String(rule.durationMinutes),
      meetingLink: rule.meetingLink || "",
      startDate: rule.startDate,
      endDate: rule.endDate || ""
    })
    setRecurringOpen(true)
  }

  async function submitLesson(event) {
    event.preventDefault()
    setError("")
    const payload = {
      studentId: Number(form.studentId),
      subject: form.subject,
      topic: form.topic,
      localDate: form.localDate,
      localTime: form.localTime,
      durationMinutes: Number(form.durationMinutes),
      meetingLink: form.meetingLink,
      status: form.status,
      transferNote: form.transferNote
    }
    try {
      if (editing) await api.updateLesson(editing.id, payload)
      else await api.createLesson(payload)
      setLessonOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function submitRecurring(event) {
    event.preventDefault()
    setError("")
    try {
      const payload = {
        ...repeatForm,
        studentId: Number(repeatForm.studentId),
        weekday: Number(repeatForm.weekday),
        durationMinutes: Number(repeatForm.durationMinutes),
        endDate: repeatForm.endDate || null
      }
      if (editingRecurring) await api.updateRecurringSchedule(editingRecurring.id, payload)
      else await api.createRecurringSchedule(payload)
      setRecurringOpen(false)
      setEditingRecurring(null)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function changeStatus(lesson, status) {
    try {
      await api.updateLesson(lesson.id, { status })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleRecurring(rule) {
    try {
      await api.updateRecurringSchedule(rule.id, { isActive: !rule.isActive })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  function moveAnchor(direction) {
    if (view === "week") setAnchor(addDays(anchor, direction * 7))
    else if (view === "month") {
      const d = new Date(`${anchor.slice(0, 7)}-15T12:00:00Z`)
      d.setUTCMonth(d.getUTCMonth() + direction)
      setAnchor(ymdFromDate(d))
    } else setAnchor(addDays(anchor, direction * 7))
  }

  function dualTime(lesson) {
    const student = students.find(item => item.id === lesson.studentId)
    if (!student || student.timezone === tutorTimezone) return null
    return `${timeInTimezone(lesson.startAt, student.timezone)} у ученика`
  }

  const currentStudent = studentFor(form.studentId)

  return (
    <>
      <div className="page-heading split-heading">
        <div>
          <h1>Расписание</h1>
          <p>Постоянная неделя создаётся один раз. Перенос отдельного занятия не меняет следующие недели.</p>
        </div>
        <div className="schedule-head-actions">
          <button className="outline-button" onClick={openRecurring}><Repeat2 size={17} /> Постоянное расписание</button>
          <button className="primary-button" onClick={() => openCreate(anchor)}><Plus size={18} /> Разовое занятие</button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button className="icon-button" onClick={() => moveAnchor(-1)}><ChevronLeft size={18} /></button>
          <button className="outline-button small-button" onClick={() => setAnchor(todayKey(tutorTimezone))}>Сегодня</button>
          <button className="icon-button" onClick={() => moveAnchor(1)}><ChevronRight size={18} /></button>
          <strong>{view === "month" ? monthLabel(anchor) : `${prettyDay(weekStart)} — ${prettyDay(addDays(weekStart, 6))}`}</strong>
        </div>
        <div className="calendar-view-switch">
          <button className={view === "week" ? "active" : ""} onClick={() => setView("week")}><CalendarDays size={15} /> Неделя</button>
          <button className={view === "month" ? "active" : ""} onClick={() => setView("month")}><Clock3 size={15} /> Месяц</button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={15} /> Список</button>
        </div>
      </div>

      <div className="timezone-note">Время репетитора: <strong>{user?.city || "Новосибирск"}</strong> · {tutorTimezone}</div>

      {view === "week" && (
        <div className="week-calendar">
          {weekDays.map((day, index) => (
            <section className={`week-day ${day === todayKey(tutorTimezone) ? "today" : ""}`} key={day}>
              <button className="week-day-head" onClick={() => openCreate(day)}>
                <span>{WEEKDAY_LABELS[index]}</span>
                <strong>{prettyDay(day)}</strong>
                <small>+ занятие</small>
              </button>
              <div className="week-day-lessons">
                {(byDate.get(day) || []).map(lesson => (
                  <article className={`calendar-lesson ${lesson.status}`} key={lesson.id}>
                    <button className="calendar-lesson-main" onClick={() => openEdit(lesson)}>
                      <strong>{timeInTimezone(lesson.startAt, tutorTimezone)} · {lesson.studentName}</strong>
                      <span>{lesson.subject}{lesson.topic ? ` · ${lesson.topic}` : ""}</span>
                      {lesson.status === "transferred" && lesson.originalStartAt && <small>Было: {timeInTimezone(lesson.originalStartAt, tutorTimezone)}</small>}
                      {dualTime(lesson) && <small>{dualTime(lesson)}</small>}
                      <em>{STATUS_LABELS[lesson.status] || lesson.status}</em>
                    </button>
                    <div className="calendar-lesson-actions">
                      <button onClick={() => changeStatus(lesson, "completed")} title="Проведено"><Check size={14} /></button>
                      <button onClick={() => changeStatus(lesson, "cancelled")} title="Отмена"><X size={14} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {view === "month" && (
        <div className="month-calendar">
          {WEEKDAY_LABELS.map(label => <div className="month-weekday" key={label}>{label}</div>)}
          {monthDays.map(day => {
            const items = byDate.get(day) || []
            const sameMonth = day.slice(0, 7) === anchor.slice(0, 7)
            return (
              <button key={day} className={`month-day ${!sameMonth ? "muted-day" : ""} ${day === todayKey(tutorTimezone) ? "today" : ""}`} onClick={() => { setAnchor(day); setView("week") }}>
                <strong>{Number(day.slice(-2))}</strong>
                <span>{items.length ? `${items.length} зан.` : ""}</span>
                {items.slice(0, 3).map(item => <small key={item.id}>{timeInTimezone(item.startAt, tutorTimezone)} {item.studentName}</small>)}
              </button>
            )
          })}
        </div>
      )}

      {view === "list" && (
        <div>
          <div className="list-filters">
            {[
              ["all", "Все"], ["today", "Сегодня"], ["transferred", "Переносы"],
              ["cancelled", "Отменённые"], ["completed", "Проведённые"], ["planned", "По плану"]
            ].map(([value, label]) => (
              <button key={value} className={listFilter === value ? "active" : ""} onClick={() => setListFilter(value)}>{label}</button>
            ))}
          </div>
          <div className="schedule-list-view">
          {lessons
            .filter(item => dateKeyInTimezone(item.startAt, tutorTimezone) >= startOfWeek(anchor))
            .filter(item => listFilter === "all" || item.status === listFilter || (listFilter === "today" && dateKeyInTimezone(item.startAt, tutorTimezone) === todayKey(tutorTimezone)))
            .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
            .slice(0, 80)
            .map(lesson => (
              <article className="schedule-list-row" key={lesson.id}>
                <div className="schedule-list-time">
                  <strong>{formatInTimezone(lesson.startAt, tutorTimezone)}</strong>
                  {lesson.status === "transferred" && lesson.originalStartAt && <small>Было: {formatInTimezone(lesson.originalStartAt, tutorTimezone)}</small>}
                  {dualTime(lesson) && <small>{dualTime(lesson)}</small>}
                </div>
                <div><strong>{lesson.studentName}</strong><span>{lesson.subject}</span></div>
                <span className={`badge ${lesson.status}`}>{STATUS_LABELS[lesson.status] || lesson.status}</span>
                <span className="tutor-only-price">{lesson.priceRub.toLocaleString("ru-RU")} ₽</span>
                <button className="icon-button" onClick={() => openEdit(lesson)}><Pencil size={16} /></button>
              </article>
            ))}
          </div>
        </div>
      )}

      <section className="section-panel recurring-panel">
        <div className="split-heading">
          <div>
            <h2>Постоянное недельное расписание</h2>
            <p>Эти правила автоматически создают занятия на следующие недели.</p>
          </div>
        </div>
        <div className="recurring-grid">
          {recurring.map(rule => (
            <article className={`recurring-card ${!rule.isActive ? "disabled" : ""}`} key={rule.id}>
              <strong>{rule.studentName}</strong>
              <span>{WEEKDAY_LABELS[rule.weekday]} · {rule.localTime} · {rule.subject}</span>
              <small>{rule.timezone}</small>
              <div className="recurring-actions"><button className="text-button" onClick={() => editRecurringRule(rule)}>Изменить</button><button className="text-button" onClick={() => toggleRecurring(rule)}>{rule.isActive ? "Приостановить" : "Возобновить"}</button></div>
            </article>
          ))}
          {!recurring.length && <p className="muted">Постоянное расписание ещё не настроено.</p>}
        </div>
      </section>

      {lessonOpen && (
        <Modal title={editing ? "Изменить / перенести занятие" : "Разовое занятие"} onClose={() => setLessonOpen(false)}>
          <form className="form" onSubmit={submitLesson}>
            {!editing && (
              <label>Ученик<select value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} required>
                <option value="">Выберите ученика</option>
                {students.map(student => <option key={student.id} value={student.id}>{student.firstName} {student.lastName} · {student.grade} класс</option>)}
              </select></label>
            )}
            <div className="form-row">
              <label>Предмет<select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}><option>Алгебра</option><option>Геометрия</option></select></label>
              <label>Длительность<select value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: e.target.value })}><option value="45">45 минут</option><option value="60">60 минут</option><option value="90">90 минут</option></select></label>
            </div>
            <label>Тема<input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} /></label>
            <div className="form-row">
              <label>Дата<input type="date" value={form.localDate} onChange={e => setForm({ ...form, localDate: e.target.value })} required /></label>
              <label>Время репетитора<input type="time" value={form.localTime} onChange={e => setForm({ ...form, localTime: e.target.value })} required /></label>
            </div>
            {currentStudent && <div className="timezone-preview">{timePreview ? <><strong>Репетитор:</strong> {timePreview.tutorLabel} · {timePreview.tutorTimezone}<br /><strong>Ученик:</strong> {timePreview.studentLabel} · {timePreview.studentCity} · {timePreview.studentTimezone}</> : <>Проверяем время для ученика…</>}</div>}
            {editing && <div className="form-row">
              <label>Статус<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="planned">По плану</option>
                <option value="transferred">Перенесено</option>
                <option value="completed">Проведено</option>
                <option value="cancelled">Отменено</option>
                <option value="no_show">Пропуск ученика</option>
              </select></label>
              <label>Причина переноса<input value={form.transferNote} onChange={e => setForm({ ...form, transferNote: e.target.value })} placeholder="Необязательно" /></label>
            </div>}
            <label>Ссылка на занятие<input type="url" value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })} placeholder="https://..." /></label>
            {editing?.recurringScheduleId && <p className="hint">Это изменение относится только к выбранному занятию. Следующая неделя останется по постоянному расписанию.</p>}
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button">{editing ? "Сохранить это занятие" : "Добавить занятие"}</button>
          </form>
        </Modal>
      )}

      {recurringOpen && (
        <Modal title={editingRecurring ? "Изменить постоянное расписание" : "Постоянное еженедельное занятие"} onClose={() => { setRecurringOpen(false); setEditingRecurring(null) }}>
          <form className="form" onSubmit={submitRecurring}>
            <label>Ученик<select value={repeatForm.studentId} disabled={Boolean(editingRecurring)} onChange={e => setRepeatForm({ ...repeatForm, studentId: e.target.value })} required>
              <option value="">Выберите ученика</option>
              {students.map(student => <option key={student.id} value={student.id}>{student.firstName} {student.lastName} · {student.grade} класс</option>)}
            </select></label>
            <div className="form-row">
              <label>День недели<select value={repeatForm.weekday} onChange={e => setRepeatForm({ ...repeatForm, weekday: e.target.value })}>{WEEKDAY_LABELS.map((label, i) => <option value={i} key={label}>{label}</option>)}</select></label>
              <label>Время по времени репетитора<input type="time" value={repeatForm.localTime} onChange={e => setRepeatForm({ ...repeatForm, localTime: e.target.value })} required /></label>
            </div>
            <div className="form-row">
              <label>Начать с<input type="date" value={repeatForm.startDate} onChange={e => setRepeatForm({ ...repeatForm, startDate: e.target.value })} required /></label>
              <label>Закончить<input type="date" value={repeatForm.endDate} onChange={e => setRepeatForm({ ...repeatForm, endDate: e.target.value })} /><small>Можно оставить пустым.</small></label>
            </div>
            <div className="form-row">
              <label>Предмет<select value={repeatForm.subject} onChange={e => setRepeatForm({ ...repeatForm, subject: e.target.value })}><option>Алгебра</option><option>Геометрия</option></select></label>
              <label>Длительность<select value={repeatForm.durationMinutes} onChange={e => setRepeatForm({ ...repeatForm, durationMinutes: e.target.value })}><option value="45">45 минут</option><option value="60">60 минут</option><option value="90">90 минут</option></select></label>
            </div>
            <label>Тема<input value={repeatForm.topic} onChange={e => setRepeatForm({ ...repeatForm, topic: e.target.value })} /></label>
            <label>Постоянная ссылка на занятие<input type="url" value={repeatForm.meetingLink} onChange={e => setRepeatForm({ ...repeatForm, meetingLink: e.target.value })} placeholder="https://..." /></label>
            <p className="hint">Время хранится относительно часового пояса репетитора. Ученик всегда увидит его в своём часовом поясе.</p>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button">{editingRecurring ? "Сохранить постоянное расписание" : "Создать постоянное расписание"}</button>
          </form>
        </Modal>
      )}
    </>
  )
}
