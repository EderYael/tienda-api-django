import React, { useState, useEffect } from 'react'
import Modal from './Modal.jsx'
import Spinner from './Spinner.jsx'

/**
 * Modal con un textarea + botones, para pedir un motivo (ej. cancelar un
 * pedido) sin depender de window.prompt() del navegador, que no se puede
 * personalizar ni queda acorde al resto del panel.
 */
export default function ModalMotivo({ abierto, titulo, etiqueta, placeholder, textoBoton, onCancelar, onConfirmar, cargando }) {
  const [valor, setValor] = useState('')

  useEffect(() => {
    if (abierto) setValor('')
  }, [abierto])

  function confirmar() {
    if (!valor.trim()) return
    onConfirmar(valor.trim())
  }

  return (
    <Modal abierto={abierto} onClose={onCancelar} titulo={titulo} ancho="420px">
      <label>{etiqueta}</label>
      <textarea
        rows="3"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        autoFocus
      />
      <div className="modal-acciones">
        <button type="button" className="btn btn-secundario" onClick={onCancelar} disabled={cargando}>
          Cancelar
        </button>
        <button type="button" className="btn btn-peligro-solido" onClick={confirmar} disabled={cargando || !valor.trim()}>
          {cargando ? <Spinner size={14} /> : null}
          {cargando ? 'Enviando...' : (textoBoton || 'Confirmar')}
        </button>
      </div>
    </Modal>
  )
}
