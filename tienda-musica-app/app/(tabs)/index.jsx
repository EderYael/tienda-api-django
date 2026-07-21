import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, getBaseUrl } from '../../utils/api.js'
import { imagenPrincipal } from '../../utils/imagenes.js'
import ProductoCard from '../../components/ProductoCard.jsx'
import ErrorConexion from '../../components/ErrorConexion.jsx'
import { Colores, Espaciado, RadioBorde } from '../../constants/theme.js'

export default function Inicio() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoriaActiva, setCategoriaActiva] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [baseUrl, setBaseUrlState] = useState('')
  const [cargando, setCargando] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [error, setError] = useState(null)

  const [resultadoIA, setResultadoIA] = useState(null)
  const [cargandoIA, setCargandoIA] = useState(false)

  // Si se llega desde la pestaña Categorías con ?categoria=<id>, preseleccionarla
  useEffect(() => {
    if (params.categoria !== undefined) {
      setCategoriaActiva(params.categoria ? parseInt(params.categoria, 10) : null)
    }
  }, [params.categoria])

  async function cargar({ mostrarSpinnerGrande = true } = {}) {
    if (mostrarSpinnerGrande) setCargando(true)
    try {
      const url = await getBaseUrl()
      setBaseUrlState(url)

      const query = busqueda.trim() ? `?search=${encodeURIComponent(busqueda.trim())}` : ''
      const [prods, cats] = await Promise.all([
        api(`/api/productos/${query}`),
        api('/api/categorias/'),
      ])
      setProductos(prods)
      setCategorias(cats)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setCargando(false)
      setRefrescando(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Vuelve a buscar cuando cambia el texto (con un pequeño debounce)
  useEffect(() => {
    const t = setTimeout(() => { cargar({ mostrarSpinnerGrande: false }) }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  const productosMostrados = categoriaActiva
    ? productos.filter((p) => p.categoria === categoriaActiva)
    : productos

  function onRefrescar() {
    setRefrescando(true)
    cargar({ mostrarSpinnerGrande: false })
  }

  async function buscarConIA() {
    if (!busqueda.trim()) return
    setCargandoIA(true)
    try {
      const data = await api('/api/ia/', { method: 'POST', body: { consulta: busqueda.trim() } })
      setResultadoIA(data)
    } catch (err) {
      setResultadoIA({ mensaje: err.message, productos: [], usando_ia: false, aviso: null, esError: true })
    } finally {
      setCargandoIA(false)
    }
  }

  function salirDeResultadoIA() {
    setResultadoIA(null)
    setBusqueda('')
  }

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Tienda Música</Text>
        <View style={estilos.buscador}>
          <Ionicons name="search" size={18} color={Colores.textoClaro} />
          <TextInput
            value={busqueda}
            onChangeText={(t) => { setBusqueda(t); if (resultadoIA) setResultadoIA(null) }}
            placeholder="Buscar instrumentos, audio..."
            placeholderTextColor={Colores.textoClaro}
            style={estilos.inputBuscador}
            onSubmitEditing={buscarConIA}
            returnKeyType="search"
          />
          <Pressable
            onPress={buscarConIA}
            disabled={!busqueda.trim() || cargandoIA}
            style={[estilos.botonIA, (!busqueda.trim() || cargandoIA) && estilos.botonIADeshabilitado]}
          >
            {cargandoIA ? (
              <ActivityIndicator size="small" color={Colores.blanco} />
            ) : (
              <Ionicons name="sparkles" size={16} color={Colores.blanco} />
            )}
          </Pressable>
        </View>

        {categorias.length > 0 && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: null, nombre: 'Todas' }, ...categorias]}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={estilos.listaChips}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setCategoriaActiva(item.id)}
                style={[estilos.chip, categoriaActiva === item.id && estilos.chipActivo]}
              >
                <Text style={[estilos.chipTexto, categoriaActiva === item.id && estilos.chipTextoActivo]}>
                  {item.nombre}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>

      {cargando ? (
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color={Colores.primario} />
        </View>
      ) : error ? (
        <ErrorConexion
          mensaje={error.message}
          esErrorDeRed={error.esErrorDeRed}
          baseUrl={baseUrl}
          onReintentar={() => cargar()}
        />
      ) : resultadoIA ? (
        <FlatList
          data={resultadoIA.productos || []}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={estilos.fila}
          contentContainerStyle={estilos.listaProductos}
          ListHeaderComponent={
            <View style={estilos.bannerIA}>
              <View style={estilos.bannerIAEncabezado}>
                <Ionicons name="sparkles" size={16} color={Colores.primario} />
                <Text style={estilos.bannerIATitulo}>
                  {resultadoIA.usando_ia ? 'Asistente de compras' : 'Búsqueda'}
                </Text>
              </View>
              <Text style={estilos.bannerIAMensaje}>{resultadoIA.mensaje}</Text>
              {resultadoIA.aviso && <Text style={estilos.bannerIAAviso}>{resultadoIA.aviso}</Text>}
              <Pressable onPress={salirDeResultadoIA}>
                <Text style={estilos.volverCatalogo}>← Volver al catálogo completo</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <View style={estilos.centrado}>
              <Ionicons name="musical-notes-outline" size={36} color={Colores.textoClaro} />
              <Text style={estilos.textoVacio}>No encontramos productos para esa búsqueda.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={estilos.itemGrid}>
              <ProductoCard
                producto={item}
                urlImagen={imagenPrincipal(item, baseUrl)}
                onPress={() => router.push(`/producto/${item.id}`)}
              />
            </View>
          )}
        />
      ) : (
        <FlatList
          data={productosMostrados}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={estilos.fila}
          contentContainerStyle={estilos.listaProductos}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor={Colores.primario} />
          }
          ListEmptyComponent={
            <View style={estilos.centrado}>
              <Ionicons name="musical-notes-outline" size={36} color={Colores.textoClaro} />
              <Text style={estilos.textoVacio}>No encontramos productos con esos filtros.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={estilos.itemGrid}>
              <ProductoCard
                producto={item}
                urlImagen={imagenPrincipal(item, baseUrl)}
                onPress={() => router.push(`/producto/${item.id}`)}
              />
            </View>
          )}
        />
      )}
    </View>
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.fondoApp },
  encabezado: {
    paddingTop: 60, paddingHorizontal: Espaciado.md, paddingBottom: Espaciado.sm,
    backgroundColor: Colores.blanco, borderBottomWidth: 1, borderBottomColor: Colores.bordeGris, gap: Espaciado.sm,
  },
  titulo: { fontSize: 24, fontWeight: '800', color: Colores.textoOscuro },
  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: Espaciado.xs + 2,
    backgroundColor: Colores.fondoApp, borderRadius: RadioBorde.boton,
    paddingHorizontal: Espaciado.sm + 2, paddingVertical: 10,
  },
  inputBuscador: { flex: 1, fontSize: 14.5, color: Colores.textoOscuro },
  botonIA: {
    width: 30, height: 30, borderRadius: RadioBorde.boton - 2, backgroundColor: Colores.primario,
    alignItems: 'center', justifyContent: 'center',
  },
  botonIADeshabilitado: { opacity: 0.4 },
  bannerIA: {
    backgroundColor: Colores.primarioClaro, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    marginBottom: Espaciado.md, gap: 4,
  },
  bannerIAEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bannerIATitulo: { fontSize: 12.5, fontWeight: '700', color: Colores.primario, textTransform: 'uppercase', letterSpacing: 0.3 },
  bannerIAMensaje: { fontSize: 14, color: Colores.textoOscuro, lineHeight: 20, marginTop: 2 },
  bannerIAAviso: { fontSize: 12, color: Colores.textoMedio, fontStyle: 'italic', marginTop: 2 },
  volverCatalogo: { fontSize: 13, fontWeight: '700', color: Colores.primario, marginTop: 8 },
  listaChips: { gap: Espaciado.xs + 2, paddingVertical: 2 },
  chip: {
    paddingHorizontal: Espaciado.sm + 2, paddingVertical: 7, borderRadius: RadioBorde.pill,
    backgroundColor: Colores.fondoApp, borderWidth: 1, borderColor: Colores.bordeGris,
  },
  chipActivo: { backgroundColor: Colores.primario, borderColor: Colores.primario },
  chipTexto: { fontSize: 12.5, fontWeight: '600', color: Colores.textoMedio },
  chipTextoActivo: { color: Colores.blanco },
  listaProductos: { padding: Espaciado.md, gap: Espaciado.md },
  fila: { gap: Espaciado.md },
  itemGrid: { flex: 1 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaciado.sm, padding: Espaciado.lg },
  textoVacio: { fontSize: 13.5, color: Colores.textoClaro, textAlign: 'center' },
  reintentar: { color: Colores.primario, fontWeight: '700', fontSize: 14 },
})
