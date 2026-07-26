import React, { useEffect, useState } from 'react'
import { View, Text, Image, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, getBaseUrl } from '../utils/api.js'
import { imagenPrincipal } from '../utils/imagenes.js'
import { useToast } from '../context/ToastContext.jsx'
import Boton from '../components/Boton.jsx'
import ModalTexto from '../components/ModalTexto.jsx'
import { Colores, Espaciado, RadioBorde } from '../constants/theme.js'

const INFO_ESTADO = {
  pendiente_pago: { fondo: Colores.naranjaFondo, texto: '#92400e', borde: '#f59e0b', icono: 'time-outline' },
  pagado: { fondo: Colores.primarioClaro, texto: Colores.primarioOscuro, borde: Colores.primario, icono: 'card-outline' },
  enviado: { fondo: Colores.verdeFondo, texto: '#047857', borde: '#10b981', icono: 'airplane-outline' },
  entregado: { fondo: Colores.verdeFondo, texto: '#047857', borde: '#10b981', icono: 'checkmark-done-circle-outline' },
  cancelado: { fondo: Colores.rojoFondo, texto: '#b91c1c', borde: Colores.rojoError, icono: 'close-circle-outline' },
}

const ETIQUETA_ESTADO = {
  pendiente_pago: 'Pendiente de pago',
  pagado: 'Pagado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const ETIQUETA_METODO = {
  deposito: 'Depósito bancario',
  tarjeta: 'Tarjeta',
}

// Pasos del flujo normal (un pedido cancelado no sigue esta línea).
const PASOS_FLUJO = [
  { clave: 'pagado', etiqueta: 'Pagado' },
  { clave: 'enviado', etiqueta: 'Enviado' },
  { clave: 'entregado', etiqueta: 'Entregado' },
]

export default function Pedidos() {
  const router = useRouter()
  const { showToast } = useToast()
  const [pedidos, setPedidos] = useState([])
  const [productosPorId, setProductosPorId] = useState({})
  const [baseUrl, setBaseUrlState] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [error, setError] = useState('')
  const [pedidoACancelar, setPedidoACancelar] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState(null)

  function cargar({ mostrarSpinnerGrande = true } = {}) {
    if (mostrarSpinnerGrande) setCargando(true)
    getBaseUrl().then(setBaseUrlState)
    Promise.all([api('/api/pedidos/'), api('/api/productos/')])
      .then(([datosPedidos, productos]) => {
        setPedidos(datosPedidos)
        const mapa = {}
        productos.forEach((p) => { mapa[p.id] = p })
        setProductosPorId(mapa)
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => { setCargando(false); setRefrescando(false) })
  }

  useEffect(() => { cargar() }, [])

  function onRefrescar() {
    setRefrescando(true)
    cargar({ mostrarSpinnerGrande: false })
  }

  async function cancelarPedido(motivo) {
    setCancelando(true)
    try {
      await api(`/api/pedidos/${pedidoACancelar.id}/cancelar/`, { method: 'POST', body: { motivo } })
      showToast(`Pedido #${pedidoACancelar.id} cancelado.`, 'info')
      setPedidoACancelar(null)
      cargar({ mostrarSpinnerGrande: false })
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setCancelando(false)
    }
  }

  async function confirmarRecepcion(pedido) {
    setConfirmandoId(pedido.id)
    try {
      await api(`/api/pedidos/${pedido.id}/confirmar-recepcion/`, { method: 'POST' })
      showToast('¡Gracias por confirmar! Esperamos que disfrutes tu compra.', 'success')
      cargar({ mostrarSpinnerGrande: false })
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setConfirmandoId(null)
    }
  }

  if (cargando) {
    return <View style={estilos.centrado}><ActivityIndicator size="large" color={Colores.primario} /></View>
  }

  if (error) {
    return <View style={estilos.centrado}><Text style={estilos.textoVacio}>{error}</Text></View>
  }

  return (
    <>
    <FlatList
      style={estilos.pantalla}
      data={pedidos.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha))}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={estilos.lista}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor={Colores.primario} />
      }
      ListEmptyComponent={
        <View style={estilos.centrado}>
          <Ionicons name="receipt-outline" size={48} color={Colores.textoClaro} />
          <Text style={estilos.tituloVacio}>Todavía no tienes pedidos</Text>
          <Text style={estilos.textoVacio}>Cuando compres algo, lo vas a poder seguir aquí.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const info = INFO_ESTADO[item.estado] || { fondo: Colores.fondoApp, texto: Colores.textoMedio, borde: Colores.bordeGris, icono: 'ellipse-outline' }
        const abierto = expandido === item.id
        const primerDetalle = item.detalles[0]
        const primerProducto = primerDetalle ? productosPorId[primerDetalle.producto] : null
        const urlMiniatura = primerProducto ? imagenPrincipal(primerProducto, baseUrl) : null
        const articulosExtra = item.detalles.length - 1
        const pasoActual = PASOS_FLUJO.findIndex((p) => p.clave === item.estado)

        return (
          <Pressable
            style={estilos.tarjeta}
            onPress={() => setExpandido(abierto ? null : item.id)}
          >
            <View style={estilos.filaSuperior}>
              <View style={[estilos.avatarEstado, { backgroundColor: info.fondo }]}>
                <Ionicons name={info.icono} size={20} color={info.texto} />
              </View>
              <View style={estilos.infoSuperior}>
                <Text style={estilos.numeroPedido}>Pedido #{item.id}</Text>
                <Text style={estilos.fecha}>{new Date(item.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              </View>
              <View style={estilos.totalBloque}>
                <Text style={estilos.totalEtiqueta}>Total</Text>
                <Text style={estilos.total}>${parseFloat(item.total).toFixed(2)}</Text>
              </View>
            </View>

            <View style={[estilos.pillEstado, { backgroundColor: info.fondo }]}>
              <Text style={[estilos.pillEstadoTexto, { color: info.texto }]}>{ETIQUETA_ESTADO[item.estado] || item.estado}</Text>
            </View>

            {/* Vista previa del primer producto, visible siempre (sin tener que expandir) */}
            <View style={estilos.previaProducto}>
              {urlMiniatura ? (
                <Image source={{ uri: urlMiniatura }} style={estilos.miniatura} resizeMode="cover" />
              ) : (
                <View style={[estilos.miniatura, estilos.miniaturaVacia]}>
                  <Ionicons name="musical-note-outline" size={16} color={Colores.textoClaro} />
                </View>
              )}
              <Text style={estilos.nombrePrimerProducto} numberOfLines={1}>
                {primerProducto ? primerProducto.nombre : `Producto #${primerDetalle?.producto}`}
                {articulosExtra > 0 && <Text style={estilos.masArticulos}>  +{articulosExtra} más</Text>}
              </Text>
              <Text style={estilos.metodoPagoChico}>
                <Ionicons name={item.metodo_pago === 'tarjeta' ? 'card-outline' : 'business-outline'} size={12} color={Colores.textoClaro} />
                {'  '}{ETIQUETA_METODO[item.metodo_pago] || item.metodo_pago}
              </Text>
            </View>

            {/* Línea de progreso con etiquetas (solo para pedidos que van en su curso normal) */}
            {pasoActual >= 0 && (
              <View style={estilos.progresoContenedor}>
                <View style={estilos.progresoFila}>
                  {PASOS_FLUJO.map((paso, i) => (
                    <React.Fragment key={paso.clave}>
                      <View style={[estilos.progresoPunto, i <= pasoActual && { backgroundColor: info.borde, borderColor: info.borde }]} />
                      {i < PASOS_FLUJO.length - 1 && (
                        <View style={[estilos.progresoLinea, i < pasoActual && { backgroundColor: info.borde }]} />
                      )}
                    </React.Fragment>
                  ))}
                </View>
                <View style={estilos.progresoEtiquetasFila}>
                  {PASOS_FLUJO.map((paso, i) => (
                    <Text
                      key={paso.clave}
                      style={[estilos.progresoEtiqueta, i <= pasoActual && { color: info.texto, fontWeight: '700' }]}
                    >
                      {paso.etiqueta}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {item.estado === 'pendiente_pago' && item.metodo_pago === 'deposito' && (
              <View style={estilos.avisoBox}>
                <Ionicons name="information-circle" size={14} color="#92400e" />
                <Text style={estilos.avisoDeposito}>Esperando que confirmemos tu depósito.</Text>
              </View>
            )}
            {item.estado === 'cancelado' && !!item.motivo_cancelacion && (
              <View style={estilos.avisoBoxCancelado}>
                <Ionicons name="alert-circle" size={14} color="#b91c1c" />
                <Text style={estilos.motivoCancelacion}>{item.motivo_cancelacion}</Text>
              </View>
            )}

            <Pressable onPress={() => setExpandido(abierto ? null : item.id)} style={estilos.verDetalleFila}>
              <Text style={estilos.verDetalleTexto}>{abierto ? 'Ocultar detalle' : 'Ver detalle del pedido'}</Text>
              <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={16} color={Colores.primario} />
            </Pressable>

            {item.estado === 'pendiente_pago' && item.metodo_pago === 'tarjeta' && (
              <Boton
                titulo="Pagar ahora"
                onPress={() => router.push(`/pagar-tarjeta?pedido_id=${item.id}`)}
              />
            )}

            {item.estado === 'enviado' && (
              <Boton
                titulo="Ya recibí mi pedido"
                onPress={() => confirmarRecepcion(item)}
                cargando={confirmandoId === item.id}
                icono={confirmandoId !== item.id ? <Ionicons name="checkmark-circle-outline" size={17} color={Colores.blanco} /> : null}
              />
            )}

            {item.estado !== 'entregado' && item.estado !== 'cancelado' && (
              <View style={{ marginTop: Espaciado.xs }}>
                <Boton
                  titulo="Cancelar pedido"
                  variante="secundario"
                  onPress={() => setPedidoACancelar(item)}
                />
              </View>
            )}

            {abierto && (
              <View style={estilos.detalles}>
                {item.detalles.map((d) => {
                  const producto = productosPorId[d.producto]
                  const urlImg = producto ? imagenPrincipal(producto, baseUrl) : null
                  return (
                    <View key={d.id} style={estilos.filaDetalle}>
                      {urlImg ? (
                        <Image source={{ uri: urlImg }} style={estilos.miniaturaChica} resizeMode="cover" />
                      ) : (
                        <View style={[estilos.miniaturaChica, estilos.miniaturaVacia]}>
                          <Ionicons name="musical-note-outline" size={13} color={Colores.textoClaro} />
                        </View>
                      )}
                      <Text style={estilos.detalleNombre} numberOfLines={1}>
                        {producto ? producto.nombre : `Producto #${d.producto}`} · x{d.cantidad}
                      </Text>
                      <Text style={estilos.detalleTexto}>${parseFloat(d.subtotal).toFixed(2)}</Text>
                    </View>
                  )
                })}
              </View>
            )}
          </Pressable>
        )
      }}
    />

    <ModalTexto
      visible={!!pedidoACancelar}
      titulo={pedidoACancelar ? `Cancelar pedido #${pedidoACancelar.id}` : ''}
      placeholder="¿Por qué quieres cancelarlo?"
      textoBoton="Cancelar pedido"
      cargando={cancelando}
      onCancelar={() => setPedidoACancelar(null)}
      onConfirmar={cancelarPedido}
    />
    </>
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.fondoApp },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaciado.sm, backgroundColor: Colores.fondoApp, padding: Espaciado.xl },
  tituloVacio: { fontSize: 16, fontWeight: '700', color: Colores.textoOscuro, marginTop: 4 },
  textoVacio: { fontSize: 13.5, color: Colores.textoClaro, textAlign: 'center' },
  lista: { padding: Espaciado.md, gap: Espaciado.lg },
  tarjeta: {
    backgroundColor: Colores.blanco,
    borderRadius: 22,
    padding: Espaciado.lg,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarEstado: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  infoSuperior: { flex: 1, gap: 2 },
  numeroPedido: { fontSize: 15.5, fontWeight: '700', color: Colores.textoOscuro },
  fecha: { fontSize: 12, color: Colores.textoClaro },
  totalBloque: { alignItems: 'flex-end' },
  totalEtiqueta: { fontSize: 10.5, fontWeight: '600', color: Colores.textoClaro, textTransform: 'uppercase', letterSpacing: 0.4 },
  total: { fontSize: 21, fontWeight: '800', color: Colores.textoOscuro },
  pillEstado: { alignSelf: 'flex-start', borderRadius: RadioBorde.pill, paddingHorizontal: 12, paddingVertical: 5 },
  pillEstadoTexto: { fontSize: 11.5, fontWeight: '700' },
  previaProducto: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colores.fondoApp, borderRadius: 14, padding: 10 },
  miniatura: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colores.blanco },
  miniaturaChica: { width: 28, height: 28, borderRadius: 6, backgroundColor: Colores.blanco },
  miniaturaVacia: { alignItems: 'center', justifyContent: 'center' },
  nombrePrimerProducto: { flex: 1, fontSize: 12.5, fontWeight: '600', color: Colores.textoOscuro },
  masArticulos: { fontSize: 11.5, fontWeight: '500', color: Colores.textoClaro },
  metodoPagoChico: { fontSize: 11, color: Colores.textoClaro },
  progresoContenedor: { gap: 6, marginVertical: 2 },
  progresoFila: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  progresoPunto: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colores.blanco, borderWidth: 2, borderColor: Colores.bordeGris },
  progresoLinea: { flex: 1, height: 2, backgroundColor: Colores.bordeGris },
  progresoEtiquetasFila: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  progresoEtiqueta: { fontSize: 10.5, color: Colores.textoClaro },
  avisoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colores.naranjaFondo, borderRadius: 12, padding: 10 },
  avisoDeposito: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 16 },
  avisoBoxCancelado: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colores.rojoFondo, borderRadius: 12, padding: 10 },
  motivoCancelacion: { flex: 1, fontSize: 12, color: '#b91c1c', lineHeight: 16 },
  verDetalleFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 2 },
  verDetalleTexto: { fontSize: 12.5, fontWeight: '700', color: Colores.primario },
  detalles: { marginTop: 2, paddingTop: Espaciado.sm, borderTopWidth: 1, borderTopColor: Colores.bordeGris, gap: 10 },
  filaDetalle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detalleNombre: { flex: 1, fontSize: 12.5, color: Colores.textoMedio },
  detalleTexto: { fontSize: 12.5, fontWeight: '600', color: Colores.textoOscuro },
})
