import React, { useEffect, useState } from "react"
import { Bell, CheckCheck, ExternalLink, X } from "lucide-react"
import { api } from "../api/client"
import { enablePushNotifications, pushStatus } from "../api/push"

export default function NotificationBell() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushMessage, setPushMessage] = useState("")

  async function load() {
    try {
      const data = await api.notifications()
      setItems(data)
    } catch {
      return
    }
  }

  useEffect(() => {
    load()

    pushStatus().then(status => {
      setPushEnabled(Boolean(status.enabled))

      if (status.supported && status.permission === "granted" && !status.enabled) {
        enablePushNotifications()
          .then(() => setPushEnabled(true))
          .catch(() => {})
      }
    })

    const timer = setInterval(load, 20000)
    return () => clearInterval(timer)
  }, [])

  const unread = items.filter(item => !item.isRead).length

  async function requestBrowserPermission() {
    setPushMessage("")

    try {
      await enablePushNotifications()
      setPushEnabled(true)
      setPushMessage("Push-уведомления включены")
    } catch (error) {
      setPushEnabled(false)
      setPushMessage(error.message)
    }
  }

  async function markRead(item) {
    if (!item.isRead) {
      await api.readNotification(item.id)
      await load()
    }

    if (item.link) {
      if (item.link.startsWith("http")) {
        window.open(item.link, "_blank")
      } else {
        window.location.href = item.link
      }
    }
  }

  async function markAll() {
    await api.readAllNotifications()
    await load()
  }

  return (
    <div className="notification-wrap">
      <button
        className="notification-button"
        onClick={() => setOpen(!open)}
      >
        <Bell size={20} />
        {unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-head">
            <strong>Уведомления</strong>
            <div>
              <button className="icon-button" onClick={markAll} title="Прочитать все">
                <CheckCheck size={18} />
              </button>
              <button className="icon-button" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </div>

          {!pushEnabled && (
            <div className="push-enable-box">
              <strong>Уведомления о занятиях</strong>
              <p>Включите push, чтобы получать напоминания даже когда STUDY не открыт.</p>
              <button className="primary-button small-button" onClick={requestBrowserPermission}>
                Включить
              </button>
              {pushMessage && <small>{pushMessage}</small>}
            </div>
          )}

          <div className="notification-list">
            {items.map(item => (
              <button
                key={item.id}
                className={`notification-item ${item.isRead ? "" : "unread"}`}
                onClick={() => markRead(item)}
              >
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  {item.kind === "promo" && (
                    <small>Приглашённому ученику — скидка 25% на первое занятие.</small>
                  )}
                </div>
                {item.link && <ExternalLink size={16} />}
              </button>
            ))}
            {!items.length && <div className="notification-empty">Уведомлений пока нет.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
