import React, { useEffect, useState } from 'react'
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, FlatList, Dimensions, Pressable,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, getBaseUrl } from '../../utils/api.js'
import { resolverUrlImagen } from '../../utils/imagenes.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Boton from '../../components/Boton.jsx'
import CampoTexto from '../../components/CampoTexto.jsx'
import { Colores, Espaciado, RadioBorde } from '../../constants/theme.js'

const ANCHO_PANTALLA = Dimensions.get('window').width

export default function DetalleProducto() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { estaLogueado } = useAuth()
  const { agregarAlCarrito } = useCart()
  const { showToast } = useToast()

  const [producto, setProducto] = useState(null)
  const [nombreCategoria, setNombreCategoria] = useState('')
  const [resenas, setResenas] = useState([])
  const [baseUrl, setBaseUrlState] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [agregando, setAgregando] = useState(false)

  const [mostrarFormResena, setMostrarFormResena] = useState(false)
  const [calificacionElegida, setCalificacionElegida] = useState(5)
  const [comentario, setComentario] = useState('')
  const [enviandoResena, setEnviandoResena] = useState(false)

  function cargar() {
    setCargando(true)
    getBaseUrl().then(setBaseUrlState)
    Promise.all([
      api(`/api/productos/${id}/`),
      api('/api/categorias/'),
      api('/api/resenas/'),
    ]).then(([prod, cats, todasLasResenas]) => {
      setProducto(prod)
      const cat = cats.find((c) => c.id === prod.categoria)
      setNombreCategoria(cat ? cat.nombre : '')
      setResenas(todasLasResenas.filter((r) => r.producto === parseInt(id, 10)))
      setError('')
    }).catch((err) => {
      setError(err.message)
    }).finally(() => setCargando(false))
  }

  useEffect(() => { if (id) cargar() }, [id])

  async function manejarAgregarCarrito() {
    if (!estaLogueado) {
      showToast('Inicia sesión para agregar productos al carrito.', 'info')
      router.push('/login')
      return
    }
    setAgregando(true)
    try {
      await agregarAlCarrito(producto.id, 1)
      showToast(`"${producto.nombre}" se agregó al carrito.`, 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAgregando(false)
    }
  }

  async function enviarResena() {
    if (!comentario.trim()) {
      showToast('Escribe un comentario antes de enviar.', 'error')
      return
    }
    setEnviandoResena(true)
    try {
      await api('/api/resenas/', {
        method: 'POST',
        body: { producto: producto.id, calificacion: calificacionElegida, comentario: comentario.trim() },
      })
      showToast('¡Gracias por tu reseña!', 'success')
      setComentario('')
      setCalificacionElegida(5)
      setMostrarFormResena(false)
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setEnviandoResena(false)
    }
  }

  if (cargando) {
    return <View style={estilos.centrado}><ActivityIndicator size="large" color={Colores.primario} /></View>
  }

  if (error || !producto) {
    return (
      <View style={estilos.centrado}>
        <Ionicons name="alert-circle-outline" size={36} color={Colores.textoClaro} />
        <Text style={estilos.textoError}>{error || 'No se encontró el producto.'}</Text>
      </View>
    )
  }

  const imagenes = producto.imagenes?.length
    ? producto.imagenes.map((i) => resolverUrlImagen(i.imagen, baseUrl))
    : []
  const sinStock = producto.stock <= 0
  const promedioResenas = resenas.length
    ? resenas.reduce((acc, r) => acc + r.calificacion, 0) / resenas.length
    : null

  return (
    <>
      <Stack.Screen options={{ title: producto.nombre }} />
      <ScrollView style={estilos.pantalla} contentContainerStyle={{ paddingBottom: Espaciado.xl }}>
        {imagenes.length > 0 ? (
          <FlatList
            data={imagenes}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, i) => String(i)}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={estilos.imagenGaleria} resizeMode="cover" />
            )}
          />
        ) : (
          <View style={[estilos.imagenGaleria, estilos.imagenVacia]}>
            <Ionicons name="image-outline" size={48} color={Colores.textoClaro} />
          </View>
        )}

        <View style={estilos.contenido}>
          {nombreCategoria ? <Text style={estilos.categoria}>{nombreCategoria}</Text> : null}
          <Text style={estilos.nombre}>{producto.nombre}</Text>
          <Text style={estilos.precio}>${parseFloat(producto.precio).toFixed(2)}</Text>

          {promedioResenas != null && (
            <View style={estilos.filaEstrellas}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons key={i} name={i < Math.round(promedioResenas) ? 'star' : 'star-outline'} size={15} color="#f59e0b" />
              ))}
              <Text style={estilos.textoResenasResumen}>{promedioResenas.toFixed(1)} ({resenas.length})</Text>
            </View>
          )}

          <View style={[estilos.badgeStock, sinStock ? estilos.badgeAgotado : estilos.badgeDisponible]}>
            <Text style={[estilos.badgeStockTexto, sinStock ? estilos.badgeAgotadoTexto : estilos.badgeDisponibleTexto]}>
              {sinStock ? 'Agotado' : `${producto.stock} disponibles`}
            </Text>
          </View>

          {producto.descripcion ? (
            <>
              <Text style={estilos.seccionTitulo}>Descripción</Text>
              <Text style={estilos.descripcion}>{producto.descripcion}</Text>
            </>
          ) : null}

          <View style={estilos.separador} />

          <View style={estilos.filaSeccionResenas}>
            <Text style={estilos.seccionTitulo}>Reseñas</Text>
            {estaLogueado && !mostrarFormResena && (
              <Pressable onPress={() => setMostrarFormResena(true)}>
                <Text style={estilos.enlaceEscribirResena}>Escribir una</Text>
              </Pressable>
            )}
          </View>

          {mostrarFormResena && (
            <View style={estilos.formResena}>
              <Text style={estilos.etiquetaEstrellas}>Tu calificación</Text>
              <View style={estilos.selectorEstrellas}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setCalificacionElegida(n)}>
                    <Ionicons name={n <= calificacionElegida ? 'star' : 'star-outline'} size={26} color="#f59e0b" />
                  </Pressable>
                ))}
              </View>
              <CampoTexto valor={comentario} onChangeText={setComentario} placeholder="Cuéntanos qué te pareció..." multiline />
              <View style={estilos.botonesResena}>
                <View style={{ flex: 1 }}>
                  <Boton titulo="Cancelar" variante="secundario" onPress={() => setMostrarFormResena(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Boton titulo="Enviar" onPress={enviarResena} cargando={enviandoResena} />
                </View>
              </View>
            </View>
          )}

          {resenas.length === 0 ? (
            <Text style={estilos.sinResenas}>Todavía no hay reseñas para este producto.</Text>
          ) : (
            resenas.map((r) => (
              <View key={r.id} style={estilos.resenaTarjeta}>
                <View style={estilos.resenaEncabezado}>
                  <Text style={estilos.resenaUsuario}>{r.usuario}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons key={i} name={i < r.calificacion ? 'star' : 'star-outline'} size={12} color="#f59e0b" />
                    ))}
                  </View>
                </View>
                <Text style={estilos.resenaComentario}>{r.comentario}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={estilos.barraInferior}>
        <Boton
          titulo={sinStock ? 'Agotado' : 'Agregar al carrito'}
          onPress={manejarAgregarCarrito}
          disabled={sinStock}
          cargando={agregando}
          icono={!agregando ? <Ionicons name="cart" size={18} color={Colores.blanco} /> : null}
        />
      </View>
    </>
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.blanco },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaciado.sm, backgroundColor: Colores.blanco },
  textoError: { fontSize: 13.5, color: Colores.textoMedio, textAlign: 'center', paddingHorizontal: Espaciado.lg },
  imagenGaleria: { width: ANCHO_PANTALLA, aspectRatio: 1, backgroundColor: Colores.fondoApp },
  imagenVacia: { alignItems: 'center', justifyContent: 'center' },
  contenido: { padding: Espaciado.lg, gap: 6 },
  categoria: { fontSize: 12.5, fontWeight: '700', color: Colores.primario, textTransform: 'uppercase', letterSpacing: 0.4 },
  nombre: { fontSize: 22, fontWeight: '800', color: Colores.textoOscuro },
  precio: { fontSize: 26, fontWeight: '800', color: Colores.textoOscuro, marginTop: 2 },
  filaEstrellas: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  textoResenasResumen: { fontSize: 12.5, color: Colores.textoClaro, marginLeft: 4 },
  badgeStock: { alignSelf: 'flex-start', borderRadius: RadioBorde.pill, paddingHorizontal: 12, paddingVertical: 5, marginTop: Espaciado.xs },
  badgeDisponible: { backgroundColor: Colores.verdeFondo },
  badgeAgotado: { backgroundColor: Colores.rojoFondo },
  badgeStockTexto: { fontSize: 12.5, fontWeight: '700' },
  badgeDisponibleTexto: { color: Colores.verdeExito },
  badgeAgotadoTexto: { color: Colores.rojoError },
  seccionTitulo: { fontSize: 14, fontWeight: '700', color: Colores.textoOscuro, marginTop: Espaciado.md },
  descripcion: { fontSize: 14, color: Colores.textoMedio, lineHeight: 21 },
  separador: { height: 1, backgroundColor: Colores.bordeGris, marginTop: Espaciado.md },
  filaSeccionResenas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  enlaceEscribirResena: { color: Colores.primario, fontWeight: '700', fontSize: 13, marginTop: Espaciado.md },
  sinResenas: { fontSize: 13, color: Colores.textoClaro, marginTop: 4 },
  formResena: {
    backgroundColor: Colores.fondoApp, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    gap: Espaciado.sm, marginTop: Espaciado.sm,
  },
  etiquetaEstrellas: { fontSize: 13, fontWeight: '600', color: Colores.textoMedio },
  selectorEstrellas: { flexDirection: 'row', gap: 6 },
  botonesResena: { flexDirection: 'row', gap: Espaciado.sm, marginTop: 2 },
  resenaTarjeta: { borderTopWidth: 1, borderTopColor: Colores.bordeGris, paddingVertical: Espaciado.sm, gap: 3 },
  resenaEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resenaUsuario: { fontSize: 13.5, fontWeight: '700', color: Colores.textoOscuro },
  resenaComentario: { fontSize: 13.5, color: Colores.textoMedio, lineHeight: 19 },
  barraInferior: {
    padding: Espaciado.md, paddingBottom: Espaciado.lg, backgroundColor: Colores.blanco,
    borderTopWidth: 1, borderTopColor: Colores.bordeGris,
  },
})
