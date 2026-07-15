import React from 'react'
import Modal from './Modal.jsx'
import { IconAlertTriangle } from './icons.jsx'
import Spinner from './Spinner.jsx'

export default function ConfirmDialog({ abierto, onClose, onConfirm, titulo, mensaje, cargando, textoConfirmar = 'Eliminar' }) {
  return (
    <Modal abierto={abierto} onClose={onClose} titulo={titulo} ancho="380px">
      <div className="confirm-cuerpo">
        <div className="confirm-icono"><IconAlertTriangle size={22} /></div>
        <p>{mensaje}</p>
      </div>
      <div className="modal-acciones">
        <button type="button" className="btn btn-secundario" onClick={onClose} disabled={cargando}>
          Cancelar
        </button>
        <button type="button" className="btn btn-peligro-solido" onClick={onConfirm} disabled={cargando}>
          {cargando ? <Spinner size={14} /> : null}
          {cargando ? 'Eliminando...' : textoConfirmar}
        </button>
      </div>
    </Modal>
  )
}
