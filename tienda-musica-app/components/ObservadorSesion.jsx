import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

/**
 * Componente sin UI propia: solo escucha cuando la sesión se cae sola
 * (token vencido y el refresh también falló) y muestra un aviso claro,
 * para que el usuario no se quede confundido pensando que cerró sesión
 * él mismo por accidente.
 */
export default function ObservadorSesion() {
  const { sesionExpiroCounter } = useAuth()
  const { showToast } = useToast()
  const primeraVez = useRef(true)

  useEffect(() => {
    // No mostrar nada en el primer render (cuando el contador arranca en 0).
    if (primeraVez.current) {
      primeraVez.current = false
      return
    }
    showToast('Tu sesión expiró. Inicia sesión de nuevo.', 'info', 5000)
  }, [sesionExpiroCounter, showToast])

  return null
}
