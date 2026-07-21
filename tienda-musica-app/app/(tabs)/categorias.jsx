import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, getBaseUrl } from '../../utils/api.js'
import ErrorConexion from '../../components/ErrorConexion.jsx'
import { Colores, Espaciado, RadioBorde } from '../../constants/theme.js'

const ICONOS_POR_DEFECTO = ['musical-notes', 'radio', 'headset', 'disc', 'mic', 'albums']

export default function Categorias() {
  const router = useRouter()
  const [categorias, setCategorias] = useState([])
  const [baseUrl, setBaseUrlState] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  function cargar() {
    setCargando(true)
    getBaseUrl().then(setBaseUrlState)
    api('/api/categorias/')
      .then((data) => { setCategorias(data); setError(null) })
      .catch(setError)
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Categorías</Text>
      </View>

      {cargando ? (
        <View style={estilos.centrado}><ActivityIndicator size="large" color={Colores.primario} /></View>
      ) : error ? (
        <ErrorConexion
          mensaje={error.message}
          esErrorDeRed={error.esErrorDeRed}
          baseUrl={baseUrl}
          onReintentar={cargar}
        />
      ) : (
        <FlatList
          data={categorias}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={estilos.lista}
          ListEmptyComponent={
            <View style={estilos.centrado}>
              <Text style={estilos.textoVacio}>Todavía no hay categorías.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={({ pressed }) => [estilos.tarjeta, pressed && estilos.tarjetaPresionada]}
              onPress={() => router.push({ pathname: '/', params: { categoria: String(item.id) } })}
            >
              <View style={estilos.iconoWrap}>
                <Ionicons name={ICONOS_POR_DEFECTO[index % ICONOS_POR_DEFECTO.length]} size={22} color={Colores.primario} />
              </View>
              <Text style={estilos.nombre}>{item.nombre}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colores.textoClaro} />
            </Pressable>
          )}
        />
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
  lista: { padding: Espaciado.md, gap: Espaciado.sm },
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: Espaciado.sm + 2,
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    borderWidth: 1, borderColor: Colores.bordeGris,
  },
  tarjetaPresionada: { opacity: 0.8 },
  iconoWrap: {
    width: 42, height: 42, borderRadius: RadioBorde.boton, backgroundColor: Colores.primarioClaro,
    alignItems: 'center', justifyContent: 'center',
  },
  nombre: { flex: 1, fontSize: 15.5, fontWeight: '600', color: Colores.textoOscuro },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Espaciado.lg },
  textoVacio: { fontSize: 13.5, color: Colores.textoClaro },
})
