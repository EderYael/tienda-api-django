import React from 'react'

// Logo de la marca: "La Onda de Compra" — una bolsa de compras con un
// ecualizador de audio integrado. Pensado para la tienda de música.
// Diseño propio (líneas + barras), inspirado en un concepto generado por IA
// que el usuario aprobó como libre de derechos para este proyecto.
export default function LogoBolsaSonido({ size = 64, color = 'currentColor', grosor = 4.5, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Asa de la bolsa */}
      <path d="M35 34 A15 15 0 0 1 65 34" stroke={color} strokeWidth={grosor} strokeLinecap="round" />
      {/* Cuerpo de la bolsa */}
      <rect x="22" y="34" width="56" height="50" rx="4" stroke={color} strokeWidth={grosor} />
      {/* Barras del ecualizador / onda de sonido */}
      <rect x="30.4" y="52" width="3.4" height="14" rx="1.7" fill={color} />
      <rect x="36.6" y="48" width="3.4" height="22" rx="1.7" fill={color} />
      <rect x="42.8" y="42" width="3.4" height="34" rx="1.7" fill={color} />
      <rect x="49"   y="37" width="3.4" height="44" rx="1.7" fill={color} />
      <rect x="55.2" y="44" width="3.4" height="30" rx="1.7" fill={color} />
      <rect x="61.4" y="50" width="3.4" height="18" rx="1.7" fill={color} />
      <rect x="67.6" y="53" width="3.4" height="12" rx="1.7" fill={color} />
    </svg>
  )
}
