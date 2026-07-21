import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { getBaseUrl, setBaseUrl } from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'
import CampoTexto from '../components/CampoTexto.jsx'
import Boton from '../components/Boton.jsx'
import { Colores, Espaciado } from '../constants/theme.js'

export default function Servidor() {
  const { showToast } = useToast()
  const [url, setUrl] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    getBaseUrl().then(setUrl)
  }, [])

  async function guardar() {
    setGuardando(true)
    try {
      await setBaseUrl(url.trim())
      showToast('Servidor actualizado. Vuelve a cargar el catálogo para verlo aplicado.', 'success')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      <Text style={estilos.explicacion}>
        Ingresa la dirección IP y puerto donde corre el servidor Django (la VM de Julian), por
        ejemplo: http://192.168.0.37:8000
      </Text>
      <CampoTexto
        etiqueta="Dirección del servidor"
        valor={url}
        onChangeText={setUrl}
        placeholder="http://192.168.0.37:8000"
        autoCapitalize="none"
        keyboardType="url"
      />
      <Boton titulo="Guardar" onPress={guardar} cargando={guardando} />
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.blanco },
  contenido: { padding: Espaciado.lg, gap: Espaciado.md },
  explicacion: { fontSize: 13.5, color: Colores.textoMedio, lineHeight: 20 },
})
