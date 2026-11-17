import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../../api/client"
import { useAuth } from "../../context/AuthContext"
import Modal from "../../components/Modal"

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, previewAs, mockMode } = useAuth()
  const [demoOpen, setDemoOpen] = useState(false)
  const [loginValue, setLoginValue] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [busy, setBusy] = useState(false)
  const [demoForm, setDemoForm] = useState({
    firstName: "",
    lastName: "",
    contact: "",
    grade: "7"
  })
  const [demoMessage, setDemoMessage] = useState("")
  const [demoError, setDemoError] = useState("")

  async function submitLogin(event) {
    event.preventDefault()
    setBusy(true)
    setLoginError("")

    try {
      const user = await login(loginValue, password)
      navigate(user.role === "tutor" ? "/tutor" : "/student")
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitDemo(event) {
    event.preventDefault()
    setDemoError("")
    setDemoMessage("")

    try {
      await api.demoRequest(demoForm)
      setDemoMessage("Заявка отправлена. С вами свяжутся по указанному контакту.")
      setDemoForm({ firstName: "", lastName: "", contact: "", grade: "7" })
    } catch (error) {
      setDemoError(error.message)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-form-side">
          <div className="auth-brand">
            <img src="/assets/logo/study_wordmark.svg" alt="STUDY" />
            <span>Больше, чем знания</span>
          </div>

          <div className="auth-form-wrap">
            <div className="eyebrow">Личный кабинет</div>
            <h1>Добро пожаловать</h1>
            <p className="auth-lead">
              Войдите по логину и паролю. Учётные записи учеников создаёт репетитор.
            </p>

            {mockMode && (
              <div className="mock-preview-box">
                <strong>Режим просмотра без базы</strong>
                <p>Можно открыть готовый интерфейс репетитора или ученика. Данные существуют только в браузере.</p>
                <div className="mock-preview-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={async () => {
                      const user = await previewAs("tutor")
                      navigate(user.role === "tutor" ? "/tutor" : "/student")
                    }}
                  >
                    Посмотреть как репетитор
                  </button>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={async () => {
                      const user = await previewAs("student")
                      navigate(user.role === "tutor" ? "/tutor" : "/student")
                    }}
                  >
                    Посмотреть как ученик
                  </button>
                </div>
              </div>
            )}

            <form className="form" onSubmit={submitLogin}>
              <label>
                Логин
                <input
                  value={loginValue}
                  onChange={event => setLoginValue(event.target.value)}
                  autoComplete="username"
                  required
                />
              </label>

              <label>
                Пароль
                <input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>

              {loginError && <p className="form-error">{loginError}</p>}

              <button className="primary-button full-width" disabled={busy}>
                {busy ? "Вход..." : "Войти"}
              </button>
            </form>
          </div>

          <div className="auth-footer-note">
            Алгебра и геометрия · 5–9 классы · ВПР · МЦКО · ОГЭ
          </div>
        </div>

        <div className="auth-art-side">
          <div className="auth-art-copy">
            <div className="eyebrow light">Онлайн-занятия</div>
            <h2>Математика становится понятной</h2>
            <p>
              Индивидуальные занятия и мини-группы. Повышение успеваемости,
              подготовка к ВПР, МЦКО и ОГЭ.
            </p>
          </div>

          <div className="auth-art-image">
            <img src="/assets/photos/books_math_geometry.png" alt="Учебные материалы по математике" />
          </div>

          <div className="demo-card">
            <span>Для новых учеников</span>
            <h3>Бесплатное демо-занятие — 20 минут</h3>
            <p>Знакомство, диагностика уровня и обсуждение дальнейшего плана.</p>
            <button className="light-button" onClick={() => setDemoOpen(true)}>
              Подать заявку
            </button>
          </div>
        </div>
      </section>

      {demoOpen && (
        <Modal title="Заявка на демо-занятие" onClose={() => setDemoOpen(false)}>
          <div className="service-details">
            <strong>Что входит</strong>
            <ul>
              <li>знакомство с учеником;</li>
              <li>проверка текущего уровня знаний;</li>
              <li>обсуждение целей и следующего занятия.</li>
            </ul>
            <p>Подробное описание услуги можно будет дополнить позже.</p>
          </div>

          <form className="form" onSubmit={submitDemo}>
            <div className="form-row">
              <label>
                Имя
                <input
                  value={demoForm.firstName}
                  onChange={event => setDemoForm({ ...demoForm, firstName: event.target.value })}
                  required
                />
              </label>

              <label>
                Фамилия
                <input
                  value={demoForm.lastName}
                  onChange={event => setDemoForm({ ...demoForm, lastName: event.target.value })}
                  required
                />
              </label>
            </div>

            <label>
              Контакт для связи
              <input
                value={demoForm.contact}
                onChange={event => setDemoForm({ ...demoForm, contact: event.target.value })}
                placeholder="Telegram или email"
                required
              />
            </label>

            <label>
              Класс
              <select
                value={demoForm.grade}
                onChange={event => setDemoForm({ ...demoForm, grade: event.target.value })}
              >
                {[5, 6, 7, 8, 9].map(grade => <option key={grade}>{grade}</option>)}
              </select>
            </label>

            {demoMessage && <p className="form-success">{demoMessage}</p>}
            {demoError && <p className="form-error">{demoError}</p>}

            <button className="primary-button">Отправить заявку</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
