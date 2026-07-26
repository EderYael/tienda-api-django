import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, Image, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { api, getBaseUrl } from '../../utils/api.js'
import { imagenPrincipal } from '../../utils/imagenes.js'
import Boton from '../../components/Boton.jsx'
import { Colores, Espaciado, RadioBorde } from '../../constants/theme.js'

export default function Carrito() {
  const { estaLogueado } = useAuth()
  const { items, cargando, totalCarrito, actualizarCantidad, eliminarDelCarrito, vaciarCarrito } = useCart()
  const { showToast } = useToast()
  const router = useRouter()
  const [actualizandoId, setActualizandoId] = useState(null)
  const [vaciando, setVaciando] = useState(false)
  const [imagenesPorProducto, setImagenesPorProducto] = useState({})
  const [baseUrl, setBaseUrlState] = useState('')

  // El carrito solo guarda nombre/precio/cantidad (no la imagen), así que
  // se cruza contra el catálogo para mostrar la miniatura de cada producto
  // — igual que cualquier carrito de tienda en línea real.
  useEffect(() => {
    if (!estaLogueado || items.length === 0) return
    getBaseUrl().then(setBaseUrlState)
    api('/api/productos/').then((productos) => {
      const mapa = {}
      productos.forEach((p) => { mapa[p.id] = p })
      setImagenesPorProducto(mapa)
    }).catch(() => {})
  }, [estaLogueado, items.length])

  async function cambiarCantidad(productoId, nuevaCantidad) {
    if (nuevaCantidad < 1) return
    setActualizandoId(productoId)
    try {
      await actualizarCantidad(productoId, nuevaCantidad)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActualizandoId(null)
    }
  }

  async function quitar(productoId) {
    setActualizandoId(productoId)
    try {
      await eliminarDelCarrito(productoId)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActualizandoId(null)
    }
  }

  function confirmarVaciar() {
    Alert.alert(
      'Vaciar carrito',
      '¿Seguro que quieres quitar todos los productos de tu carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar', style: 'destructive',
          onPress: async () => {
            setVaciando(true)
            try {
              await vaciarCarrito()
              showToast('Carrito vaciado.', 'info')
            } catch (err) {
              showToast(err.message, 'error')
            } finally {
              setVaciando(false)
            }
          },
        },
      ]
    )
  }

  if (!estaLogueado) {
    return (
      <View style={estilos.pantalla}>
        <View style={estilos.encabezado}><Text style={estilos.titulo}>Carrito</Text></View>
        <View style={estilos.centrado}>
          <Ionicons name="cart-outline" size={48} color={Colores.textoClaro} />
          <Text style={estilos.mensaje}>Inicia sesión para armar tu carrito y hacer pedidos.</Text>
          <Boton titulo="Iniciar sesión" onPress={() => router.push('/login')} />
        </View>
      </View>
    )
  }

  const unidadesTotales = items.reduce((acc, i) => acc + i.cantidad, 0)

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Carrito</Text>
        {items.length > 0 && (
          <Pressable onPress={confirmarVaciar} disabled={vaciando}>
            <Text style={estilos.enlaceVaciar}>{vaciando ? 'Vaciando...' : 'Vaciar'}</Text>
          </Pressable>
        )}
      </View>

      {cargando ? (
        <View style={estilos.centrado}><ActivityIndicator size="large" color={Colores.primario} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.producto_id)}
          contentContainerStyle={estilos.lista}
          ListEmptyComponent={
            <View style={estilos.centrado}>
              <Ionicons name="cart-outline" size={56} color={Colores.textoClaro} />
              <Text style={estilos.mensajeVacioTitulo}>Tu carrito está vacío</Text>
              <Text style={estilos.mensaje}>Explora el catálogo y agrega algo que te guste.</Text>
              <Boton titulo="Explorar catálogo" onPress={() => router.push('/')} />
            </View>
          }
          renderItem={({ item }) => {
            const producto = imagenesPorProducto[item.producto_id]
            const urlImagen = producto ? imagenPrincipal(producto, baseUrl) : null
            const subtotal = parseFloat(item.precio) * item.cantidad
            return (
              <Pressable
                style={estilos.itemTarjeta}
                onPress={() => router.push(`/producto/${item.producto_id}`)}
              >
                {urlImagen ? (
                  <Image source={{ uri: urlImagen }} style={estilos.itemImagen} resizeMode="cover" />
                ) : (
                  <View style={[estilos.itemImagen, estilos.itemImagenVacia]}>
                    <Ionicons name="image-outline" size={20} color={Colores.textoClaro} />
                  </View>
                )}

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={estilos.itemNombre} numberOfLines={2}>{item.nombre}</Text>
                  <Text style={estilos.itemPrecioUnitario}>${parseFloat(item.precio).toFixed(2)} c/u</Text>

                  <View style={estilos.filaControlYPrecio}>
                    <View style={estilos.controlCantidad}>
                      <Pressable
                        style={estilos.botonCantidad}
                        onPress={(e) => { e.stopPropagation(); cambiarCantidad(item.producto_id, item.cantidad - 1) }}
                        disabled={actualizandoId === item.producto_id}
                        hitSlop={8}
                      >
                        <Ionicons name="remove" size={15} color={Colores.textoOscuro} />
                      </Pressable>
                      <Text style={estilos.cantidadTexto}>{item.cantidad}</Text>
                      <Pressable
                        style={estilos.botonCantidad}
                        onPress={(e) => { e.stopPropagation(); cambiarCantidad(item.producto_id, item.cantidad + 1) }}
                        disabled={actualizandoId === item.producto_id}
                        hitSlop={8}
                      >
                        <Ionicons name="add" size={15} color={Colores.textoOscuro} />
                      </Pressable>
                    </View>
                    <Text style={estilos.itemSubtotal}>${subtotal.toFixed(2)}</Text>
                  </View>
                </View>

                <Pressable
                  onPress={(e) => { e.stopPropagation(); quitar(item.producto_id) }}
                  style={estilos.botonQuitar}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={Colores.rojoError} />
                </Pressable>
              </Pressable>
            )
          }}
        />
      )}

      {items.length > 0 && (
        <View style={estilos.barraInferior}>
          <View style={estilos.resumenCard}>
            <View style={estilos.filaResumen}>
              <Text style={estilos.resumenEtiqueta}>{unidadesTotales} artículo{unidadesTotales !== 1 ? 's' : ''}</Text>
              <Text style={estilos.resumenValor}>${totalCarrito.toFixed(2)}</Text>
            </View>
            <View style={[estilos.filaResumen, estilos.filaTotalFinal]}>
              <Text style={estilos.totalEtiqueta}>Total</Text>
              <Text style={estilos.totalValor}>${totalCarrito.toFixed(2)}</Text>
            </View>
          </View>
          <Boton titulo="Confirmar pedido" onPress={() => router.push('/checkout')} />
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  titulo: { fontSize: 24, fontWeight: '800', color: Colores.textoOscuro },
  enlaceVaciar: { fontSize: 13.5, fontWeight: '700', color: Colores.rojoError },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaciado.sm, padding: Espaciado.xl },
  mensajeVacioTitulo: { fontSize: 17, fontWeight: '700', color: Colores.textoOscuro, marginTop: 4 },
  mensaje: { fontSize: 14, color: Colores.textoMedio, textAlign: 'center', lineHeight: 20 },
  lista: { padding: Espaciado.md, gap: Espaciado.sm, flexGrow: 1 },
  itemTarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: Espaciado.sm,
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.sm,
    borderWidth: 1, borderColor: Colores.bordeGris,
  },
  itemImagen: { width: 60, height: 60, borderRadius: RadioBorde.boton, backgroundColor: Colores.fondoApp },
  itemImagenVacia: { alignItems: 'center', justifyContent: 'center' },
  itemNombre: { fontSize: 13.5, fontWeight: '600', color: Colores.textoOscuro },
  itemPrecioUnitario: { fontSize: 12, color: Colores.textoClaro },
  filaControlYPrecio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  controlCantidad: {
    flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colores.fondoApp,
    borderRadius: RadioBorde.boton, padding: 3,
  },
  botonCantidad: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: Colores.blanco, borderRadius: 7 },
  cantidadTexto: { minWidth: 18, textAlign: 'center', fontSize: 13, fontWeight: '700', color: Colores.textoOscuro },
  itemSubtotal: { fontSize: 14.5, fontWeight: '800', color: Colores.primario },
  botonQuitar: { padding: 6 },
  barraInferior: {
    padding: Espaciado.md, paddingBottom: Espaciado.lg, backgroundColor: Colores.blanco,
    borderTopWidth: 1, borderTopColor: Colores.bordeGris, gap: Espaciado.sm,
  },
  resumenCard: { gap: 6 },
  filaResumen: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resumenEtiqueta: { fontSize: 13, color: Colores.textoClaro },
  resumenValor: { fontSize: 13, color: Colores.textoClaro },
  filaTotalFinal: { borderTopWidth: 1, borderTopColor: Colores.bordeGris, paddingTop: 6 },
  totalEtiqueta: { fontSize: 15, fontWeight: '600', color: Colores.textoMedio },
  totalValor: { fontSize: 22, fontWeight: '800', color: Colores.primario },
})
