import React, { useEffect, useState } from 'react'
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, FlatList, Dimensions, Pressable, Alert,
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
const RESENA_VACIA = { calificacion: 5, comentario: '' }

export default function DetalleProducto() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { estaLogueado, usuario } = useAuth()
  const { agregarAlCarrito } = useCart()
  const { showToast } = useToast()

  const [producto, setProducto] = useState(null)
  const [nombreCategoria, setNombreCategoria] = useState('')
  const [resenas, setResenas] = useState([])
  const [preguntas, setPreguntas] = useState([])
  const [baseUrl, setBaseUrlState] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [cantidadElegida, setCantidadElegida] = useState(1)
  const [indiceImagenActual, setIndiceImagenActual] = useState(0)

  const [mostrarFormResena, setMostrarFormResena] = useState(false)
  const [resenaEditandoId, setResenaEditandoId] = useState(null)
  const [calificacionElegida, setCalificacionElegida] = useState(RESENA_VACIA.calificacion)
  const [comentario, setComentario] = useState(RESENA_VACIA.comentario)
  const [enviandoResena, setEnviandoResena] = useState(false)

  const [mostrarFormPregunta, setMostrarFormPregunta] = useState(false)
  const [textoPregunta, setTextoPregunta] = useState('')
  const [enviandoPregunta, setEnviandoPregunta] = useState(false)

  function cargar() {
    setCargando(true)
    getBaseUrl().then(setBaseUrlState)
    Promise.all([
      api(`/api/productos/${id}/`),
      api('/api/categorias/'),
      api('/api/resenas/'),
      api(`/api/preguntas/?producto=${id}`),
    ]).then(([prod, cats, todasLasResenas, preguntasProducto]) => {
      setProducto(prod)
      const cat = cats.find((c) => c.id === prod.categoria)
      setNombreCategoria(cat ? cat.nombre : '')
      setResenas(todasLasResenas.filter((r) => r.producto === parseInt(id, 10)))
      setPreguntas(preguntasProducto.slice().sort((a, b) => new Date(b.fecha_pregunta) - new Date(a.fecha_pregunta)))
      setError('')
    }).catch((err) => {
      setError(err.message)
    }).finally(() => setCargando(false))
  }

  useEffect(() => { if (id) { cargar(); setCantidadElegida(1); setIndiceImagenActual(0) } }, [id])

  async function manejarAgregarCarrito() {
    if (!estaLogueado) {
      showToast('Inicia sesión para agregar productos al carrito.', 'info')
      router.push('/login')
      return
    }
    setAgregando(true)
    try {
      await agregarAlCarrito(producto.id, cantidadElegida)
      showToast(`${cantidadElegida} × "${producto.nombre}" se agregó al carrito.`, 'success')
      setCantidadElegida(1)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAgregando(false)
    }
  }

  function abrirNuevaResena() {
    setResenaEditandoId(null)
    setCalificacionElegida(RESENA_VACIA.calificacion)
    setComentario(RESENA_VACIA.comentario)
    setMostrarFormResena(true)
  }

  function abrirEditarResena(resena) {
    setResenaEditandoId(resena.id)
    setCalificacionElegida(resena.calificacion)
    setComentario(resena.comentario)
    setMostrarFormResena(true)
  }

  function cerrarFormResena() {
    setMostrarFormResena(false)
    setResenaEditandoId(null)
  }

  async function enviarResena() {
    if (!comentario.trim()) {
      showToast('Escribe un comentario antes de enviar.', 'error')
      return
    }
    setEnviandoResena(true)
    try {
      if (resenaEditandoId) {
        await api(`/api/resenas/${resenaEditandoId}/`, {
          method: 'PUT',
          body: { producto: producto.id, calificacion: calificacionElegida, comentario: comentario.trim() },
        })
        showToast('Reseña actualizada.', 'success')
      } else {
        await api('/api/resenas/', {
          method: 'POST',
          body: { producto: producto.id, calificacion: calificacionElegida, comentario: comentario.trim() },
        })
        showToast('¡Gracias por tu reseña!', 'success')
      }
      cerrarFormResena()
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setEnviandoResena(false)
    }
  }

  function confirmarEliminarResena(resena) {
    Alert.alert(
      'Eliminar reseña',
      '¿Seguro que quieres eliminar tu reseña?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await api(`/api/resenas/${resena.id}/`, { method: 'DELETE' })
              showToast('Reseña eliminada.', 'success')
              cargar()
            } catch (err) {
              showToast(err.message, 'error')
            }
          },
        },
      ]
    )
  }

  function manejarAbrirPregunta() {
    if (!estaLogueado) {
      showToast('Inicia sesión para hacer una pregunta.', 'info')
      router.push('/login')
      return
    }
    setMostrarFormPregunta(true)
  }

  async function enviarPregunta() {
    if (!textoPregunta.trim()) {
      showToast('Escribe tu pregunta antes de enviarla.', 'error')
      return
    }
    setEnviandoPregunta(true)
    try {
      await api('/api/preguntas/', {
        method: 'POST',
        body: { producto: producto.id, pregunta: textoPregunta.trim() },
      })
      showToast('¡Tu pregunta se envió! Te responderemos pronto.', 'success')
      setTextoPregunta('')
      setMostrarFormPregunta(false)
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setEnviandoPregunta(false)
    }
  }

  function confirmarEliminarPregunta(pregunta) {
    Alert.alert(
      'Eliminar pregunta',
      '¿Seguro que quieres eliminar tu pregunta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await api(`/api/preguntas/${pregunta.id}/`, { method: 'DELETE' })
              showToast('Pregunta eliminada.', 'success')
              cargar()
            } catch (err) {
              showToast(err.message, 'error')
            }
          },
        },
      ]
    )
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
  const yaTieneResena = estaLogueado && resenas.some((r) => r.usuario === usuario?.username)

  return (
    <>
      <Stack.Screen options={{ title: producto.nombre }} />
      <ScrollView style={estilos.pantalla} contentContainerStyle={{ paddingBottom: Espaciado.xl }}>
        {imagenes.length > 0 ? (
          <>
            <FlatList
              data={imagenes}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => String(i)}
              onMomentumScrollEnd={(e) => {
                const indice = Math.round(e.nativeEvent.contentOffset.x / ANCHO_PANTALLA)
                setIndiceImagenActual(indice)
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={estilos.imagenGaleria} resizeMode="cover" />
              )}
            />
            {imagenes.length > 1 && (
              <View style={estilos.puntosGaleria}>
                {imagenes.map((_, i) => (
                  <View key={i} style={[estilos.punto, i === indiceImagenActual && estilos.puntoActivo]} />
                ))}
              </View>
            )}
          </>
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
          {!sinStock && producto.stock <= 5 && (
            <Text style={estilos.avisoUrgencia}>¡Solo quedan {producto.stock}! Se está agotando.</Text>
          )}

          {!sinStock && (
            <View style={estilos.selectorCantidadFila}>
              <Text style={estilos.etiquetaCantidad}>Cantidad</Text>
              <View style={estilos.controlCantidadGrande}>
                <Pressable
                  style={estilos.botonCantidadGrande}
                  onPress={() => setCantidadElegida(Math.max(1, cantidadElegida - 1))}
                  hitSlop={8}
                >
                  <Ionicons name="remove" size={17} color={Colores.textoOscuro} />
                </Pressable>
                <Text style={estilos.cantidadTextoGrande}>{cantidadElegida}</Text>
                <Pressable
                  style={estilos.botonCantidadGrande}
                  onPress={() => setCantidadElegida(Math.min(producto.stock, cantidadElegida + 1))}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={17} color={Colores.textoOscuro} />
                </Pressable>
              </View>
            </View>
          )}

          {producto.descripcion ? (
            <>
              <Text style={estilos.seccionTitulo}>Descripción</Text>
              <Text style={estilos.descripcion}>{producto.descripcion}</Text>
            </>
          ) : null}

          <View style={estilos.separador} />

          <View style={estilos.filaSeccionResenas}>
            <Text style={estilos.seccionTitulo}>Reseñas</Text>
            {estaLogueado && !mostrarFormResena && !yaTieneResena && (
              <Pressable onPress={abrirNuevaResena}>
                <Text style={estilos.enlaceEscribirResena}>Escribir una</Text>
              </Pressable>
            )}
          </View>

          {resenas.length > 0 && (
            <View style={estilos.distribucionCard}>
              <View style={estilos.distribucionResumen}>
                <Text style={estilos.distribucionNumero}>{promedioResenas.toFixed(1)}</Text>
                <View>
                  <View style={{ flexDirection: 'row' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons key={i} name={i < Math.round(promedioResenas) ? 'star' : 'star-outline'} size={13} color="#f59e0b" />
                    ))}
                  </View>
                  <Text style={estilos.distribucionTotal}>{resenas.length} reseña{resenas.length !== 1 ? 's' : ''}</Text>
                </View>
              </View>
              <View style={estilos.distribucionBarras}>
                {[5, 4, 3, 2, 1].map((n) => {
                  const cantidad = resenas.filter((r) => r.calificacion === n).length
                  const porcentaje = resenas.length ? (cantidad / resenas.length) * 100 : 0
                  return (
                    <View key={n} style={estilos.filaDistribucion}>
                      <Text style={estilos.distribucionEstrellaTexto}>{n}★</Text>
                      <View style={estilos.barraFondo}>
                        <View style={[estilos.barraLlena, { width: `${porcentaje}%` }]} />
                      </View>
                      <Text style={estilos.distribucionCantidad}>{cantidad}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

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
                  <Boton titulo="Cancelar" variante="secundario" onPress={cerrarFormResena} />
                </View>
                <View style={{ flex: 1 }}>
                  <Boton titulo={resenaEditandoId ? 'Guardar cambios' : 'Enviar'} onPress={enviarResena} cargando={enviandoResena} />
                </View>
              </View>
            </View>
          )}

          {resenas.length === 0 ? (
            <Text style={estilos.sinResenas}>Todavía no hay reseñas para este producto.</Text>
          ) : (
            resenas.map((r) => {
              const esMia = estaLogueado && r.usuario === usuario?.username
              return (
                <View key={r.id} style={estilos.resenaTarjeta}>
                  <View style={estilos.resenaEncabezado}>
                    <View style={estilos.resenaUsuarioFila}>
                      <Text style={estilos.resenaUsuario}>{r.usuario}</Text>
                      {esMia && (
                        <View style={estilos.badgeTuya}>
                          <Text style={estilos.badgeTuyaTexto}>Tú</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons key={i} name={i < r.calificacion ? 'star' : 'star-outline'} size={12} color="#f59e0b" />
                      ))}
                    </View>
                  </View>
                  {r.compra_verificada && (
                    <View style={estilos.badgeVerificada}>
                      <Ionicons name="checkmark-circle" size={12} color={Colores.verdeExito} />
                      <Text style={estilos.badgeVerificadaTexto}>Compra verificada</Text>
                    </View>
                  )}
                  <Text style={estilos.resenaComentario}>{r.comentario}</Text>
                  {esMia && (
                    <View style={estilos.resenaAcciones}>
                      <Pressable onPress={() => abrirEditarResena(r)}>
                        <Text style={estilos.resenaAccionTexto}>Editar</Text>
                      </Pressable>
                      <Pressable onPress={() => confirmarEliminarResena(r)}>
                        <Text style={[estilos.resenaAccionTexto, estilos.resenaAccionEliminar]}>Eliminar</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )
            })
          )}

          <View style={estilos.separador} />

          <View style={estilos.filaSeccionResenas}>
            <Text style={estilos.seccionTitulo}>Preguntas y respuestas</Text>
            {!mostrarFormPregunta && (
              <Pressable onPress={manejarAbrirPregunta}>
                <Text style={estilos.enlaceEscribirResena}>Preguntar</Text>
              </Pressable>
            )}
          </View>

          {mostrarFormPregunta && (
            <View style={estilos.formResena}>
              <CampoTexto
                valor={textoPregunta}
                onChangeText={setTextoPregunta}
                placeholder="Ej. ¿Incluye estuche? ¿Hace envíos a Oaxaca?"
                multiline
              />
              <View style={estilos.botonesResena}>
                <View style={{ flex: 1 }}>
                  <Boton titulo="Cancelar" variante="secundario" onPress={() => { setMostrarFormPregunta(false); setTextoPregunta('') }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Boton titulo="Enviar pregunta" onPress={enviarPregunta} cargando={enviandoPregunta} />
                </View>
              </View>
            </View>
          )}

          {preguntas.length === 0 ? (
            <Text style={estilos.sinResenas}>Todavía no hay preguntas para este producto. ¡Sé el primero!</Text>
          ) : (
            preguntas.map((p) => {
              const esMia = estaLogueado && p.usuario === usuario?.username
              return (
                <View key={p.id} style={estilos.preguntaTarjeta}>
                  <View style={estilos.preguntaEncabezado}>
                    <Ionicons name="help-circle-outline" size={16} color={Colores.primario} />
                    <Text style={estilos.preguntaTexto}>{p.pregunta}</Text>
                  </View>
                  <Text style={estilos.preguntaAutor}>
                    {p.usuario}{esMia ? ' (tú)' : ''} · {new Date(p.fecha_pregunta).toLocaleDateString('es-MX')}
                  </Text>

                  {p.respuesta ? (
                    <View style={estilos.respuestaBox}>
                      <Ionicons name="storefront-outline" size={14} color={Colores.verdeExito} />
                      <Text style={estilos.respuestaTexto}>{p.respuesta}</Text>
                    </View>
                  ) : (
                    <Text style={estilos.sinResponder}>Sin responder aún.</Text>
                  )}

                  {esMia && (
                    <Pressable onPress={() => confirmarEliminarPregunta(p)} style={{ marginTop: 4 }}>
                      <Text style={[estilos.resenaAccionTexto, estilos.resenaAccionEliminar]}>Eliminar</Text>
                    </Pressable>
                  )}
                </View>
              )
            })
          )}
        </View>
      </ScrollView>

      <View style={estilos.barraInferior}>
        {!sinStock && cantidadElegida > 1 && (
          <Text style={estilos.subtotalBarra}>
            Subtotal: ${(parseFloat(producto.precio) * cantidadElegida).toFixed(2)}
          </Text>
        )}
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
  puntosGaleria: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colores.bordeGris },
  puntoActivo: { backgroundColor: Colores.primario, width: 16 },
  avisoUrgencia: { fontSize: 12.5, fontWeight: '700', color: '#c2410c', marginTop: 4 },
  selectorCantidadFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Espaciado.sm },
  etiquetaCantidad: { fontSize: 14, fontWeight: '600', color: Colores.textoMedio },
  controlCantidadGrande: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colores.fondoApp,
    borderRadius: RadioBorde.boton, padding: 5,
  },
  botonCantidadGrande: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: Colores.blanco, borderRadius: 9 },
  cantidadTextoGrande: { minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: '700', color: Colores.textoOscuro },
  subtotalBarra: { fontSize: 13, color: Colores.textoMedio, textAlign: 'center', marginBottom: 6 },
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
  distribucionCard: {
    flexDirection: 'row', gap: Espaciado.md, backgroundColor: Colores.fondoApp,
    borderRadius: RadioBorde.tarjeta, padding: Espaciado.md, marginTop: Espaciado.sm,
  },
  distribucionResumen: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distribucionNumero: { fontSize: 28, fontWeight: '800', color: Colores.textoOscuro },
  distribucionTotal: { fontSize: 11.5, color: Colores.textoClaro, marginTop: 2 },
  distribucionBarras: { flex: 1, justifyContent: 'center', gap: 3 },
  filaDistribucion: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distribucionEstrellaTexto: { fontSize: 11, color: Colores.textoMedio, width: 20 },
  barraFondo: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colores.bordeGris, overflow: 'hidden' },
  barraLlena: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },
  distribucionCantidad: { fontSize: 11, color: Colores.textoClaro, width: 16, textAlign: 'right' },
  badgeVerificada: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  badgeVerificadaTexto: { fontSize: 11, fontWeight: '700', color: Colores.verdeExito },
  formResena: {
    backgroundColor: Colores.fondoApp, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    gap: Espaciado.sm, marginTop: Espaciado.sm,
  },
  etiquetaEstrellas: { fontSize: 13, fontWeight: '600', color: Colores.textoMedio },
  selectorEstrellas: { flexDirection: 'row', gap: 6 },
  botonesResena: { flexDirection: 'row', gap: Espaciado.sm, marginTop: 2 },
  resenaTarjeta: { borderTopWidth: 1, borderTopColor: Colores.bordeGris, paddingVertical: Espaciado.sm, gap: 3 },
  resenaEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resenaUsuarioFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resenaUsuario: { fontSize: 13.5, fontWeight: '700', color: Colores.textoOscuro },
  badgeTuya: { backgroundColor: Colores.primarioClaro, borderRadius: RadioBorde.pill, paddingHorizontal: 7, paddingVertical: 1 },
  badgeTuyaTexto: { fontSize: 10, fontWeight: '700', color: Colores.primario },
  resenaComentario: { fontSize: 13.5, color: Colores.textoMedio, lineHeight: 19 },
  resenaAcciones: { flexDirection: 'row', gap: Espaciado.md, marginTop: 4 },
  resenaAccionTexto: { fontSize: 12.5, fontWeight: '700', color: Colores.primario },
  resenaAccionEliminar: { color: Colores.rojoError },
  preguntaTarjeta: { borderTopWidth: 1, borderTopColor: Colores.bordeGris, paddingVertical: Espaciado.sm, gap: 4 },
  preguntaEncabezado: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  preguntaTexto: { flex: 1, fontSize: 13.5, fontWeight: '600', color: Colores.textoOscuro, lineHeight: 19 },
  preguntaAutor: { fontSize: 11.5, color: Colores.textoClaro, marginLeft: 22 },
  respuestaBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginLeft: 22, marginTop: 2,
    backgroundColor: Colores.verdeFondo, borderRadius: RadioBorde.boton, padding: Espaciado.sm,
  },
  respuestaTexto: { flex: 1, fontSize: 13, color: '#047857', lineHeight: 18 },
  sinResponder: { fontSize: 12, color: Colores.textoClaro, fontStyle: 'italic', marginLeft: 22 },
  barraInferior: {
    padding: Espaciado.md, paddingBottom: Espaciado.lg, backgroundColor: Colores.blanco,
    borderTopWidth: 1, borderTopColor: Colores.bordeGris,
  },
})
