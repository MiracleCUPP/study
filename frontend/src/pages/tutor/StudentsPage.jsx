import React, { useEffect, useState } from "react"
import { api } from "../../api/client"
import Modal from "../../components/Modal"
import { TIMEZONE_OPTIONS } from "../../utils/timezones"

const emptyForm = {
  firstName: "",
  lastName: "",
  grade: "7",
  login: "",
  password: "",
  lessonPriceRub: "1400",
  city: "Новосибирск",
  timezone: "Asia/Novosibirsk"
}

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")

  async function load() {
    try {
      setStudents(await api.students())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { load() }, [])

  async function submit(event) {
    event.preventDefault()
    setError("")
    try {
      await api.createStudent(form)
      setForm(emptyForm)
      setOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function changeStudent(student) {
    const lessonPriceRub = prompt("Новая стоимость занятия", student.lessonPriceRub)
    if (lessonPriceRub === null) return
    const city = prompt("Город ученика", student.city || "")
    if (city === null) return
    const timezone = prompt("Часовой пояс IANA, например Europe/Moscow", student.timezone || "Asia/Novosibirsk")
    if (timezone === null) return
    try {
      await api.updateStudent(student.id, { lessonPriceRub, city, timezone })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="page-heading split-heading">
        <div>
          <h1>Ученики</h1>
          <p>При создании ученика укажите город и часовой пояс — календарь автоматически покажет каждому его местное время.</p>
        </div>
        <button className="primary-button" onClick={() => setOpen(true)}>+ Создать учётную запись</button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ученик</th>
              <th>Класс</th>
              <th>Город</th>
              <th>Часовой пояс</th>
              <th>Логин</th>
              <th>Стоимость</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id}>
                <td>{student.firstName} {student.lastName}</td>
                <td>{student.grade}</td>
                <td>{student.city || "—"}</td>
                <td>{student.timezone || "—"}</td>
                <td>{student.login}</td>
                <td>{student.lessonPriceRub.toLocaleString("ru-RU")} ₽</td>
                <td><button className="text-button" onClick={() => changeStudent(student)}>Изменить</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!students.length && <div className="empty-state compact-empty">Учеников пока нет.</div>}
      </div>

      {open && (
        <Modal title="Создать учётную запись ученика" onClose={() => setOpen(false)}>
          <form className="form" onSubmit={submit}>
            <div className="form-row">
              <label>Имя<input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required /></label>
              <label>Фамилия<input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required /></label>
            </div>
            <label>
              Класс
              <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
                {[5, 6, 7, 8, 9].map(grade => <option key={grade}>{grade}</option>)}
              </select>
            </label>
            <div className="form-row">
              <label>Город<input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Например, Москва" required /></label>
              <label>
                Часовой пояс
                <select value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
                  {TIMEZONE_OPTIONS.map(([label, value]) => <option value={value} key={value}>{label} · {value}</option>)}
                </select>
              </label>
            </div>
            <p className="hint">Адрес не нужен. Для корректного времени достаточно города и часового пояса.</p>
            <label>Логин<input value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} required /></label>
            <label>Пароль<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
            <label>Стоимость занятия, ₽<input type="number" min="0" value={form.lessonPriceRub} onChange={e => setForm({ ...form, lessonPriceRub: e.target.value })} required /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button">Создать аккаунт</button>
          </form>
        </Modal>
      )}
    </>
  )
}
