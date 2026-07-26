import React, { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Boton from '../../components/Boton.jsx'
import CampoTexto from '../../components/CampoTexto.jsx'
import { Colores, Espaciado, RadioBorde } from '../../constants/theme.js'
import { api } from '../../utils/api.js'

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REGEX_PASSWORD_VALIDA = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

export default function Perfil() {
  const router = useRouter()
  const { usuario, cargandoSesion, estaLogueado, cerrarSesion, actualizarPerfil } = useAuth()
  const { showToast } = useToast()
  const [cerrando, setCerrando] = useState(false)

  const [seccionAbierta, setSeccionAbierta] = useState(null) // 'email' | 'password' | null

  const [nuevoEmail, setNuevoEmail] = useState('')
  const [errorEmail, setErrorEmail] = useState('')
  const [guardandoEmail, setGuardandoEmail] = useState(false)

  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [erroresPassword, setErroresPassword] = useState({})
  const [guardandoPassword, setGuardandoPassword] = useState(false)

  async function manejarCerrarSesion() {
    setCerrando(true)
    try {
      await cerrarSesion()
      showToast('Sesión cerrada.', 'info')
    } finally {
      setCerrando(false)
    }
  }

  function abrirEditarEmail() {
    setNuevoEmail(usuario.email || '')
    setErrorEmail('')
    setSeccionAbierta('email')
  }

  async function guardarEmail() {
    const valor = nuevoEmail.trim()
    if (!REGEX_EMAIL.test(valor)) {
      setErrorEmail('Ingresa un correo válido.')
      return
    }
    setGuardandoEmail(true)
    try {
      await actualizarPerfil({ email: valor })
      showToast('Correo actualizado.', 'success')
      setSeccionAbierta(null)
    } catch (err) {
      setErrorEmail(err.message)
    } finally {
      setGuardandoEmail(false)
    }
  }

  function abrirCambiarPassword() {
    setPasswordActual('')
    setPasswordNueva('')
    setErroresPassword({})
    setSeccionAbierta('password')
  }

  async function guardarPassword() {
    const err = {}
    if (!passwordActual) err.actual = 'Ingresa tu contraseña actual.'
    if (!REGEX_PASSWORD_VALIDA.test(passwordNueva)) err.nueva = 'Mínimo 8 caracteres, con letras y números.'
    setErroresPassword(err)
    if (Object.keys(err).length > 0) return

    setGuardandoPassword(true)
    try {
      await api('/api/mi-perfil/cambiar-password/', {
        method: 'POST',
        body: { password_actual: passwordActual, password_nueva: passwordNueva },
      })
      showToast('Contraseña actualizada.', 'success')
      setSeccionAbierta(null)
    } catch (err) {
      setErroresPassword({ general: Array.isArray(err.data?.error) ? err.data.error.join(' ') : err.message })
    } finally {
      setGuardandoPassword(false)
    }
  }

  if (cargandoSesion) {
    return (
      <View style={estilos.pantalla}>
        <View style={estilos.centrado}><ActivityIndicator size="large" color={Colores.primario} /></View>
      </View>
    )
  }

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Perfil</Text>
      </View>

      {!estaLogueado ? (
        <View style={estilos.contenido}>
          <View style={estilos.centradoAnidado}>
            <View style={estilos.avatarVacio}>
              <Ionicons name="person-outline" size={32} color={Colores.textoClaro} />
            </View>
            <Text style={estilos.mensaje}>Inicia sesión para ver tus pedidos, guardar direcciones y dejar reseñas.</Text>
            <View style={estilos.botones}>
              <Boton titulo="Iniciar sesión" onPress={() => router.push('/login')} />
              <Boton titulo="Crear cuenta" variante="secundario" onPress={() => router.push('/registro')} />
            </View>
          </View>

          <Pressable style={estilos.opcion} onPress={() => router.push('/servidor')}>
            <Ionicons name="server-outline" size={20} color={Colores.textoMedio} />
            <Text style={estilos.opcionTexto}>Configuración del servidor</Text>
            <Ionicons name="chevron-forward" size={18} color={Colores.textoClaro} />
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={estilos.contenido}>
          <View style={estilos.tarjetaUsuario}>
            <View style={estilos.avatar}>
              <Text style={estilos.avatarInicial}>{usuario.username?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={estilos.username}>{usuario.username}</Text>
              <Text style={estilos.email}>{usuario.email || 'Sin correo registrado'}</Text>
            </View>
          </View>

          <Text style={estilos.seccionEtiqueta}>Cuenta</Text>

          <Pressable style={estilos.opcion} onPress={() => (seccionAbierta === 'email' ? setSeccionAbierta(null) : abrirEditarEmail())}>
            <Ionicons name="mail-outline" size={20} color={Colores.textoMedio} />
            <Text style={estilos.opcionTexto}>Editar correo</Text>
            <Ionicons name={seccionAbierta === 'email' ? 'chevron-up' : 'chevron-forward'} size={18} color={Colores.textoClaro} />
          </Pressable>
          {seccionAbierta === 'email' && (
            <View style={estilos.panelEdicion}>
              <CampoTexto
                etiqueta="Correo"
                valor={nuevoEmail}
                onChangeText={(t) => { setNuevoEmail(t); setErrorEmail('') }}
                placeholder="tucorreo@ejemplo.com"
                autoCapitalize="none"
                keyboardType="email-address"
                error={errorEmail}
              />
              <Boton titulo="Guardar correo" onPress={guardarEmail} cargando={guardandoEmail} />
            </View>
          )}

          <Pressable style={estilos.opcion} onPress={() => (seccionAbierta === 'password' ? setSeccionAbierta(null) : abrirCambiarPassword())}>
            <Ionicons name="lock-closed-outline" size={20} color={Colores.textoMedio} />
            <Text style={estilos.opcionTexto}>Cambiar contraseña</Text>
            <Ionicons name={seccionAbierta === 'password' ? 'chevron-up' : 'chevron-forward'} size={18} color={Colores.textoClaro} />
          </Pressable>
          {seccionAbierta === 'password' && (
            <View style={estilos.panelEdicion}>
              <CampoTexto
                etiqueta="Contraseña actual"
                valor={passwordActual}
                onChangeText={(t) => { setPasswordActual(t); setErroresPassword({ ...erroresPassword, actual: null, general: null }) }}
                esPassword
                error={erroresPassword.actual}
              />
              <CampoTexto
                etiqueta="Contraseña nueva"
                valor={passwordNueva}
                onChangeText={(t) => { setPasswordNueva(t); setErroresPassword({ ...erroresPassword, nueva: null, general: null }) }}
                placeholder="Mínimo 8 caracteres, letras y números"
                esPassword
                error={erroresPassword.nueva}
              />
              {erroresPassword.general ? <Text style={estilos.errorGeneral}>{erroresPassword.general}</Text> : null}
              <Boton titulo="Guardar contraseña" onPress={guardarPassword} cargando={guardandoPassword} />
            </View>
          )}

          <Text style={estilos.seccionEtiqueta}>Compras</Text>

          <Pressable style={estilos.opcion} onPress={() => router.push('/pedidos')}>
            <Ionicons name="receipt-outline" size={20} color={Colores.textoMedio} />
            <Text style={estilos.opcionTexto}>Mis pedidos</Text>
            <Ionicons name="chevron-forward" size={18} color={Colores.textoClaro} />
          </Pressable>

          <Pressable style={estilos.opcion} onPress={() => router.push('/direcciones')}>
            <Ionicons name="location-outline" size={20} color={Colores.textoMedio} />
            <Text style={estilos.opcionTexto}>Mis direcciones</Text>
            <Ionicons name="chevron-forward" size={18} color={Colores.textoClaro} />
          </Pressable>

          <Text style={estilos.seccionEtiqueta}>General</Text>

          <Pressable style={estilos.opcion} onPress={() => router.push('/servidor')}>
            <Ionicons name="server-outline" size={20} color={Colores.textoMedio} />
            <Text style={estilos.opcionTexto}>Configuración del servidor</Text>
            <Ionicons name="chevron-forward" size={18} color={Colores.textoClaro} />
          </Pressable>

          <View style={{ marginTop: Espaciado.lg }}>
            <Boton titulo="Cerrar sesión" variante="peligro" cargando={cerrando} onPress={manejarCerrarSesion} />
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.fondoApp },
  encabezado: {
    paddingTop: 60, paddingHorizontal: Espaciado.md, paddingBottom: Espaciado.md,
    backgroundColor: Colores.blanco, borderBottomWidth: 1, borderBottomColor: Colores.bordeGris,
  },
  titulo: { fontSize: 24, fontWeight: '800', color: Colores.textoOscuro },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaciado.md, padding: Espaciado.xl },
  centradoAnidado: { alignItems: 'center', justifyContent: 'center', gap: Espaciado.md, paddingVertical: Espaciado.xl, paddingHorizontal: Espaciado.md },
  avatarVacio: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colores.bordeGris,
    alignItems: 'center', justifyContent: 'center',
  },
  mensaje: { fontSize: 14, color: Colores.textoMedio, textAlign: 'center', lineHeight: 20 },
  botones: { width: '100%', gap: Espaciado.sm, marginTop: Espaciado.sm },
  contenido: { padding: Espaciado.md, gap: Espaciado.sm },
  tarjetaUsuario: {
    flexDirection: 'row', alignItems: 'center', gap: Espaciado.sm + 2,
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    borderWidth: 1, borderColor: Colores.bordeGris, marginBottom: Espaciado.xs,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colores.primario,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInicial: { color: Colores.blanco, fontSize: 20, fontWeight: '800' },
  username: { fontSize: 16.5, fontWeight: '700', color: Colores.textoOscuro },
  email: { fontSize: 13, color: Colores.textoClaro, marginTop: 2 },
  seccionEtiqueta: {
    fontSize: 11.5, fontWeight: '700', color: Colores.textoClaro, textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: Espaciado.sm, marginBottom: 2, marginLeft: 2,
  },
  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: Espaciado.sm,
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    borderWidth: 1, borderColor: Colores.bordeGris,
  },
  opcionTexto: { flex: 1, fontSize: 14.5, color: Colores.textoOscuro, fontWeight: '500' },
  panelEdicion: {
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    borderWidth: 1, borderColor: Colores.primarioClaro, gap: Espaciado.sm, marginTop: -4,
  },
  errorGeneral: { fontSize: 12.5, color: Colores.rojoError, fontWeight: '500' },
})
