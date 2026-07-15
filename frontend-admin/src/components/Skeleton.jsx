import React from 'react'

export function SkeletonFilas({ filas = 5, columnas = 5 }) {
  return (
    <>
      {Array.from({ length: filas }).map((_, i) => (
        <tr key={i} className="skeleton-fila">
          {Array.from({ length: columnas }).map((__, j) => (
            <td key={j}><div className="skeleton-bloque" /></td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function SkeletonTarjetas({ cantidad = 4 }) {
  return (
    <div className="tarjetas-kpi">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="tarjeta-kpi">
          <div className="skeleton-bloque" style={{ width: 90, height: 12, marginBottom: 14 }} />
          <div className="skeleton-bloque" style={{ width: 60, height: 26 }} />
        </div>
      ))}
    </div>
  )
}
