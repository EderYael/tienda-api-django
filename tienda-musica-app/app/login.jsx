import React, { useState } from 'react'
import { View, Text, Image, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import CampoTexto from '../components/CampoTexto.jsx'
import Boton from '../components/Boton.jsx'
import { Colores, Espaciado } from '../constants/theme.js'
import { LOGO_BASE64 } from '../utils/logoBase64.js'

export default function Login() {
  const router = useRouter()
  const { iniciarSesion } = useAuth()
  const { showToast } = useToast()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function manejarSubmit() {
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña.')
      return
    }
    setError('')
    setCargando(true)
    try {
      await iniciarSesion(username.trim(), password)
      showToast('¡Bienvenido de nuevo!', 'success')
      router.back()
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={estilos.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <View style={estilos.logoWrap}>
          <Image source={{ uri: LOGO_BASE64 }} style={estilos.logo} resizeMode="contain" />
        </View>
        <Text style={estilos.titulo}>Tienda Música</Text>
        <Text style={estilos.subtitulo}>Ingresa tus datos para continuar</Text>

        <CampoTexto
          etiqueta="Usuario"
          valor={username}
          onChangeText={setUsername}
          placeholder="Tu usuario"
          autoCapitalize="none"
        />
        <CampoTexto
          etiqueta="Contraseña"
          valor={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          esPassword
        />

        {error ? <Text style={estilos.error}>{error}</Text> : null}

        <Boton titulo="Entrar" onPress={manejarSubmit} cargando={cargando} />

        <Text style={estilos.pieTexto}>
          ¿No tienes cuenta?{' '}
          <Text style={estilos.enlace} onPress={() => router.replace('/registro')}>
            Crear una
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.blanco },
  contenido: { padding: Espaciado.lg, gap: Espaciado.md },
  logoWrap: { alignItems: 'center', marginTop: Espaciado.lg, marginBottom: Espaciado.xs },
  logo: { width: 88, height: 88 },
  titulo: { fontSize: 22, fontWeight: '800', color: Colores.textoOscuro, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: Colores.textoMedio, marginBottom: Espaciado.xs, textAlign: 'center' },
  error: { fontSize: 13, color: Colores.rojoError, fontWeight: '500' },
  pieTexto: { fontSize: 13.5, color: Colores.textoMedio, textAlign: 'center', marginTop: Espaciado.sm },
  enlace: { color: Colores.primario, fontWeight: '700' },
})
