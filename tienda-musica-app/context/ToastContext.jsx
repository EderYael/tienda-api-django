import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colores, Espaciado, RadioBorde } from '../constants/theme.js'

const ToastContext = createContext(null)
let idContador = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const quitar = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const showToast = useCallback((mensaje, tipo = 'success', duracionMs) => {
    const id = ++idContador
    const duracion = duracionMs ?? (tipo === 'error' ? 4500 : 2800)
    setToasts((prev) => [...prev, { id, mensaje, tipo }])
    timers.current[id] = setTimeout(() => quitar(id), duracion)
    return id
  }, [quitar])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={estilos.contenedor} pointerEvents="none">
        {toasts.map((t) => (
          <View
            key={t.id}
            style={[
              estilos.toast,
              t.tipo === 'error' && estilos.toastError,
              t.tipo === 'info' && estilos.toastInfo,
            ]}
          >
            <Ionicons
              name={t.tipo === 'error' ? 'alert-circle' : t.tipo === 'info' ? 'information-circle' : 'checkmark-circle'}
              size={18}
              color={t.tipo === 'error' ? Colores.rojoError : t.tipo === 'info' ? Colores.primario : Colores.verdeExito}
            />
            <Text style={estilos.texto}>{t.mensaje}</Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

const estilos = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    top: 56,
    left: Espaciado.md,
    right: Espaciado.md,
    gap: Espaciado.sm,
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaciado.sm,
    backgroundColor: Colores.blanco,
    borderRadius: RadioBorde.tarjeta,
    paddingVertical: Espaciado.sm + 2,
    paddingHorizontal: Espaciado.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  toastError: { borderLeftWidth: 3, borderLeftColor: Colores.rojoError },
  toastInfo: { borderLeftWidth: 3, borderLeftColor: Colores.primario },
  texto: { flex: 1, fontSize: 13.5, color: Colores.textoOscuro, fontWeight: '500' },
})
