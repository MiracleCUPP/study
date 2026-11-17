import React, { useEffect, useState } from "react"
import { Mail, Send } from "lucide-react"
import { api } from "../../api/client"

export default function SupportPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.support().then(setData)
  }, [])

  if (!data) return <div className="empty-state">Загрузка...</div>

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Поддержка</h1>
          <p>Контакты разделены по типу вопроса.</p>
        </div>
      </div>

      <div className="support-grid">
        <article className="support-card important">
          <span>Срочные вопросы</span>
          <h2>{data.support.title}</h2>
          <p>{data.support.description}</p>
          <a href={`https://t.me/${data.support.telegram.replace("@", "")}`} target="_blank" rel="noreferrer">
            <Send size={18} /> {data.support.telegram}
          </a>
          <a href={`mailto:${data.support.email}`}>
            <Mail size={18} /> {data.support.email}
          </a>
        </article>

        <article className="support-card">
          <span>Вопросы по занятиям</span>
          <h2>{data.tutor.title}</h2>
          <p>{data.tutor.description}</p>
          <a href={`https://t.me/${data.tutor.telegram.replace("@", "")}`} target="_blank" rel="noreferrer">
            <Send size={18} /> {data.tutor.telegram}
          </a>
          <a href={`mailto:${data.tutor.email}`}>
            <Mail size={18} /> {data.tutor.email}
          </a>
        </article>
      </div>
    </>
  )
}
