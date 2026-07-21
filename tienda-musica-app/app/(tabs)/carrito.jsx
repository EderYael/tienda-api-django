import React, { useState } from 'react'
import { View, Text, FlatList, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Boton from '../../components/Boton.jsx'
import { Colores, Espaciado, RadioBorde } from '../../constants/theme.js'

export default function Carrito() {
  const { estaLogueado } = useAuth()
  const { items, cargando, totalCarrito, actualizarCantidad, eliminarDelCarrito } = useCart()
  const { showToast } = useToast()
  const router = useRouter()
  const [actualizandoId, setActualizandoId] = useState(null)

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

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Carrito</Text>
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
              <Ionicons name="cart-outline" size={48} color={Colores.textoClaro} />
              <Text style={estilos.mensaje}>Tu carrito está vacío. Explora el catálogo y agrega algo.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={estilos.itemTarjeta}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.itemNombre} numberOfLines={2}>{item.nombre}</Text>
                <Text style={estilos.itemPrecioUnitario}>${parseFloat(item.precio).toFixed(2)} c/u</Text>
              </View>

              <View style={estilos.controlCantidad}>
                <Pressable
                  style={estilos.botonCantidad}
                  onPress={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}
                  disabled={actualizandoId === item.producto_id}
                >
                  <Ionicons name="remove" size={16} color={Colores.textoOscuro} />
                </Pressable>
                <Text style={estilos.cantidadTexto}>{item.cantidad}</Text>
                <Pressable
                  style={estilos.botonCantidad}
                  onPress={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}
                  disabled={actualizandoId === item.producto_id}
                >
                  <Ionicons name="add" size={16} color={Colores.textoOscuro} />
                </Pressable>
              </View>

              <Pressable onPress={() => quitar(item.producto_id)} style={estilos.botonQuitar}>
                <Ionicons name="trash-outline" size={18} color={Colores.rojoError} />
              </Pressable>
            </View>
          )}
        />
      )}

      {items.length > 0 && (
        <View style={estilos.barraInferior}>
          <View style={estilos.filaTotal}>
            <Text style={estilos.totalEtiqueta}>Total</Text>
            <Text style={estilos.totalValor}>${totalCarrito.toFixed(2)}</Text>
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
  },
  titulo: { fontSize: 24, fontWeight: '800', color: Colores.textoOscuro },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaciado.md, padding: Espaciado.xl },
  mensaje: { fontSize: 14, color: Colores.textoMedio, textAlign: 'center', lineHeight: 20 },
  lista: { padding: Espaciado.md, gap: Espaciado.sm, flexGrow: 1 },
  itemTarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: Espaciado.sm,
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    borderWidth: 1, borderColor: Colores.bordeGris,
  },
  itemNombre: { fontSize: 14, fontWeight: '600', color: Colores.textoOscuro },
  itemPrecioUnitario: { fontSize: 12.5, color: Colores.textoClaro, marginTop: 2 },
  controlCantidad: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colores.fondoApp,
    borderRadius: RadioBorde.boton, padding: 4,
  },
  botonCantidad: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: Colores.blanco, borderRadius: 8 },
  cantidadTexto: { minWidth: 20, textAlign: 'center', fontSize: 14, fontWeight: '700', color: Colores.textoOscuro },
  botonQuitar: { padding: 4 },
  barraInferior: {
    padding: Espaciado.md, paddingBottom: Espaciado.lg, backgroundColor: Colores.blanco,
    borderTopWidth: 1, borderTopColor: Colores.bordeGris, gap: Espaciado.sm,
  },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalEtiqueta: { fontSize: 15, fontWeight: '600', color: Colores.textoMedio },
  totalValor: { fontSize: 22, fontWeight: '800', color: Colores.primario },
})
