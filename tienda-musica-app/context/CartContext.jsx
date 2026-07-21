import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api } from '../utils/api.js'
import { useAuth } from './AuthContext.jsx'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { estaLogueado } = useAuth()
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(false)

  const cargarCarrito = useCallback(async () => {
    if (!estaLogueado) { setItems([]); return }
    setCargando(true)
    try {
      const data = await api('/api/carrito/')
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setCargando(false)
    }
  }, [estaLogueado])

  // Carga el carrito al iniciar sesión, y lo vacía localmente al cerrar sesión
  // (el carrito real en el servidor pertenece a esa cuenta, no a "invitado").
  useEffect(() => {
    if (estaLogueado) cargarCarrito()
    else setItems([])
  }, [estaLogueado, cargarCarrito])

  async function agregarAlCarrito(productoId, cantidad = 1) {
    const data = await api('/api/carrito/agregar/', {
      method: 'POST',
      body: { producto_id: productoId, cantidad },
    })
    setItems(data)
  }

  async function actualizarCantidad(productoId, cantidad) {
    const data = await api(`/api/carrito/actualizar/${productoId}/`, {
      method: 'PUT',
      body: { cantidad },
    })
    setItems(data)
  }

  async function eliminarDelCarrito(productoId) {
    const data = await api(`/api/carrito/eliminar/${productoId}/`, { method: 'DELETE' })
    setItems(data)
  }

  async function vaciarCarrito() {
    await api('/api/carrito/vaciar/', { method: 'DELETE' })
    setItems([])
  }

  async function confirmarPedido(direccionId) {
    const resultado = await api('/api/carrito/confirmar/', {
      method: 'POST',
      body: direccionId ? { direccion_id: direccionId } : {},
    })
    setItems([])
    return resultado
  }

  const totalCarrito = items.reduce((acc, item) => acc + parseFloat(item.precio) * item.cantidad, 0)
  const cantidadItems = items.reduce((acc, item) => acc + item.cantidad, 0)

  return (
    <CartContext.Provider
      value={{
        items, cargando, totalCarrito, cantidadItems,
        cargarCarrito, agregarAlCarrito, actualizarCantidad, eliminarDelCarrito, vaciarCarrito, confirmarPedido,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
