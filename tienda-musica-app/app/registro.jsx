import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import CampoTexto from '../components/CampoTexto.jsx'
import Boton from '../components/Boton.jsx'
import { Colores, Espaciado } from '../constants/theme.js'

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Registro() {
  const router = useRouter()
  const { crearCuenta } = useAuth()
  const { showToast } = useToast()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errores, setErrores] = useState({})
  const [cargando, setCargando] = useState(false)

  function validar() {
    const err = {}
    if (!username.trim()) err.username = 'El usuario es obligatorio'
    if (!email.trim()) err.email = 'El correo es obligatorio'
    else if (!REGEX_EMAIL.test(email.trim())) err.email = 'Ingresa un correo válido'
    if (!password || password.length < 8) err.password = 'Mínimo 8 caracteres'
    return err
  }

  async function manejarSubmit() {
    const erroresLocales = validar()
    setErrores(erroresLocales)
    if (Object.keys(erroresLocales).length > 0) return

    setCargando(true)
    try {
      await crearCuenta(username.trim(), email.trim(), password)
      showToast('¡Cuenta creada! Ya iniciaste sesión.', 'success')
      router.back()
    } catch (err) {
      setErrores({ general: err.message })
    } finally {
      setCargando(false)
    }
  }

  return (
    <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Text style={estilos.subtitulo}>Crea tu cuenta para comprar y dejar reseñas</Text>

        <CampoTexto
          etiqueta="Usuario"
          valor={username}
          onChangeText={(t) => { setUsername(t); setErrores({ ...errores, username: null }) }}
          placeholder="Elige un usuario"
          autoCapitalize="none"
          error={errores.username}
        />
        <CampoTexto
          etiqueta="Correo"
          valor={email}
          onChangeText={(t) => { setEmail(t); setErrores({ ...errores, email: null }) }}
          placeholder="tucorreo@ejemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          error={errores.email}
        />
        <CampoTexto
          etiqueta="Contraseña"
          valor={password}
          onChangeText={(t) => { setPassword(t); setErrores({ ...errores, password: null }) }}
          placeholder="Mínimo 8 caracteres"
          esPassword
          error={errores.password}
        />

        {errores.general ? <Text style={estilos.error}>{errores.general}</Text> : null}

        <Boton titulo="Crear cuenta" onPress={manejarSubmit} cargando={cargando} />

        <Text style={estilos.pieTexto}>
          ¿Ya tienes cuenta?{' '}
          <Text style={estilos.enlace} onPress={() => router.replace('/login')}>
            Inicia sesión
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.blanco },
  contenido: { padding: Espaciado.lg, gap: Espaciado.md },
  subtitulo: { fontSize: 14, color: Colores.textoMedio, marginBottom: Espaciado.xs },
  error: { fontSize: 13, color: Colores.rojoError, fontWeight: '500' },
  pieTexto: { fontSize: 13.5, color: Colores.textoMedio, textAlign: 'center', marginTop: Espaciado.sm },
  enlace: { color: Colores.primario, fontWeight: '700' },
})
