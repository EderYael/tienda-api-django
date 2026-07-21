import React from 'react'
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Colores, Espaciado, RadioBorde } from '../constants/theme.js'

export default function Boton({ titulo, onPress, variante = 'primario', cargando = false, disabled = false, icono = null }) {
  const deshabilitado = disabled || cargando

  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [
        estilos.base,
        estilos[variante],
        deshabilitado && estilos.deshabilitado,
        pressed && !deshabilitado && estilos.presionado,
      ]}
    >
      {cargando ? (
        <ActivityIndicator size="small" color={variante === 'primario' ? Colores.blanco : Colores.primario} />
      ) : (
        <>
          {icono}
          <Text style={[estilos.texto, estilos[`texto_${variante}`]]}>{titulo}</Text>
        </>
      )}
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Espaciado.xs + 2,
    paddingVertical: 13, paddingHorizontal: Espaciado.md, borderRadius: RadioBorde.boton,
  },
  primario: { backgroundColor: Colores.primario },
  secundario: { backgroundColor: Colores.blanco, borderWidth: 1.5, borderColor: Colores.bordeGris },
  peligro: { backgroundColor: Colores.rojoError },
  presionado: { opacity: 0.85 },
  deshabilitado: { opacity: 0.5 },
  texto: { fontSize: 15, fontWeight: '700' },
  texto_primario: { color: Colores.blanco },
  texto_secundario: { color: Colores.textoOscuro },
  texto_peligro: { color: Colores.blanco },
})
