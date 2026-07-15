import React, { useEffect } from 'react'
import { IconX } from './icons.jsx'

export default function Modal({ abierto, onClose, titulo, children, ancho }) {
  useEffect(() => {
    if (!abierto) return
    function alPresionarTecla(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  }, [abierto, onClose])

  if (!abierto) return null

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={ancho ? { width: ancho } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button type="button" className="modal-cerrar" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
