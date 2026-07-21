import React, { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Boton from '../../components/Boton.jsx'
import { Colores, Espaciado, RadioBorde } from '../../constants/theme.js'

export default function Perfil() {
  const router = useRouter()
  const { usuario, cargandoSesion, estaLogueado, cerrarSesion } = useAuth()
  const { showToast } = useToast()
  const [cerrando, setCerrando] = useState(false)

  async function manejarCerrarSesion() {
    setCerrando(true)
    try {
      await cerrarSesion()
      showToast('Sesión cerrada.', 'info')
    } finally {
      setCerrando(false)
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
        <View style={estilos.contenido}>
          <View style={estilos.tarjetaUsuario}>
            <View style={estilos.avatar}>
              <Text style={estilos.avatarInicial}>{usuario.username?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={estilos.username}>{usuario.username}</Text>
              <Text style={estilos.email}>{usuario.email || 'Sin correo registrado'}</Text>
            </View>
          </View>

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

          <Pressable style={estilos.opcion} onPress={() => router.push('/servidor')}>
            <Ionicons name="server-outline" size={20} color={Colores.textoMedio} />
            <Text style={estilos.opcionTexto}>Configuración del servidor</Text>
            <Ionicons name="chevron-forward" size={18} color={Colores.textoClaro} />
          </Pressable>

          <View style={{ marginTop: Espaciado.lg }}>
            <Boton titulo="Cerrar sesión" variante="peligro" cargando={cerrando} onPress={manejarCerrarSesion} />
          </View>
        </View>
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
    borderWidth: 1, borderColor: Colores.bordeGris, marginBottom: Espaciado.sm,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colores.primario,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInicial: { color: Colores.blanco, fontSize: 20, fontWeight: '800' },
  username: { fontSize: 16.5, fontWeight: '700', color: Colores.textoOscuro },
  email: { fontSize: 13, color: Colores.textoClaro, marginTop: 2 },
  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: Espaciado.sm,
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    borderWidth: 1, borderColor: Colores.bordeGris,
  },
  opcionTexto: { flex: 1, fontSize: 14.5, color: Colores.textoOscuro, fontWeight: '500' },
})
