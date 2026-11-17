import React from "react"
import { X } from "lucide-react"

export default function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <section className={`modal ${wide ? "modal-wide" : ""}`} onMouseDown={event => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
