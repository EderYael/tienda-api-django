import React from 'react'

export default function Spinner({ size = 14, oscuro = false }) {
  return (
    <span
      className={`spinner ${oscuro ? 'spinner-oscuro' : ''}`}
      style={{ width: size, height: size }}
    />
  )
}
