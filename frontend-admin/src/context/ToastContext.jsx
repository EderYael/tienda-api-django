import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { IconCheckCircle, IconAlertTriangle, IconInfo, IconX } from '../components/icons.jsx'

const ToastContext = createContext(null)
let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const showToast = useCallback((mensaje, tipo = 'success', opciones = {}) => {
    const id = ++idCounter
    const duracion = opciones.duracion ?? (tipo === 'error' ? 5500 : 3200)
    const titulo = opciones.titulo || (tipo === 'error' ? 'Error' : tipo === 'info' ? 'Aviso' : 'Listo')
    setToasts((prev) => [...prev, { id, mensaje, tipo, titulo }])
    timers.current[id] = setTimeout(() => remove(id), duracion)
    return id
  }, [remove])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-contenedor">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tipo}`} role="status">
            <span className="toast-icono">
              {t.tipo === 'success' && <IconCheckCircle size={19} />}
              {t.tipo === 'error' && <IconAlertTriangle size={19} />}
              {t.tipo === 'info' && <IconInfo size={19} />}
            </span>
            <div className="toast-texto">
              <strong>{t.titulo}</strong>
              <span>{t.mensaje}</span>
            </div>
            <button type="button" className="toast-cerrar" onClick={() => remove(t.id)} aria-label="Cerrar">
              <IconX size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
