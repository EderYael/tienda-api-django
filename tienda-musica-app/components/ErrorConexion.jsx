import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Boton from './Boton.jsx'
import { Colores, Espaciado } from '../constants/theme.js'

/**
 * Estado de error reutilizable para pantallas que dependen del servidor.
 * Si el error es de conexión (esErrorDeRed), muestra la URL a la que se
 * intentó conectar y un botón directo a la pantalla de configuración —
 * así nunca queda "escondido" cómo arreglarlo, sin importar si el usuario
 * es invitado o ya inició sesión.
 */
export default function ErrorConexion({ mensaje, esErrorDeRed, baseUrl, onReintentar }) {
  const router = useRouter()

  return (
    <View style={estilos.contenedor}>
      <Ionicons name="cloud-offline-outline" size={36} color={Colores.textoClaro} />
      <Text style={estilos.mensaje}>{mensaje}</Text>
      {esErrorDeRed && baseUrl ? (
        <Text style={estilos.urlIntentada}>Intentando conectar a: {baseUrl}</Text>
      ) : null}

      <View style={estilos.acciones}>
        <View style={{ flex: 1 }}>
          <Boton titulo="Reintentar" variante="secundario" onPress={onReintentar} />
        </View>
        {esErrorDeRed && (
          <View style={{ flex: 1 }}>
            <Boton titulo="Configurar servidor" onPress={() => router.push('/servidor')} />
          </View>
        )}
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaciado.sm, padding: Espaciado.lg },
  mensaje: { fontSize: 13.5, color: Colores.textoMedio, textAlign: 'center' },
  urlIntentada: { fontSize: 12, color: Colores.textoClaro, textAlign: 'center', fontFamily: 'monospace' },
  acciones: { flexDirection: 'row', gap: Espaciado.sm, marginTop: Espaciado.sm },
})
