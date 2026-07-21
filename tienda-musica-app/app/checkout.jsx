import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../utils/api.js'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import Boton from '../components/Boton.jsx'
import { Colores, Espaciado, RadioBorde } from '../constants/theme.js'

export default function Checkout() {
  const router = useRouter()
  const { items, totalCarrito, confirmarPedido } = useCart()
  const { showToast } = useToast()

  const [direcciones, setDirecciones] = useState([])
  const [direccionElegida, setDireccionElegida] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    api('/api/direcciones/')
      .then((data) => {
        setDirecciones(data)
        const principal = data.find((d) => d.es_principal) || data[0]
        if (principal) setDireccionElegida(principal.id)
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function manejarConfirmar() {
    setConfirmando(true)
    try {
      const resultado = await confirmarPedido(direccionElegida)
      showToast(`¡Pedido #${resultado.pedido_id} creado!`, 'success')
      router.replace('/pedidos')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setConfirmando(false)
    }
  }

  if (cargando) {
    return <View style={estilos.centrado}><ActivityIndicator size="large" color={Colores.primario} /></View>
  }

  return (
    <View style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={estilos.seccionTitulo}>Resumen del pedido</Text>
        <View style={estilos.resumenTarjeta}>
          {items.map((item) => (
            <View key={item.producto_id} style={estilos.filaResumen}>
              <Text style={estilos.itemNombre} numberOfLines={1}>{item.cantidad}x {item.nombre}</Text>
              <Text style={estilos.itemPrecio}>${(parseFloat(item.precio) * item.cantidad).toFixed(2)}</Text>
            </View>
          ))}
          <View style={[estilos.filaResumen, estilos.filaTotal]}>
            <Text style={estilos.totalTexto}>Total</Text>
            <Text style={estilos.totalValor}>${totalCarrito.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={estilos.seccionTitulo}>Dirección de envío</Text>
        {direcciones.length === 0 ? (
          <View style={estilos.sinDireccion}>
            <Text style={estilos.textoVacio}>No tienes direcciones guardadas todavía.</Text>
            <Boton titulo="Agregar dirección" variante="secundario" onPress={() => router.push('/direcciones')} />
          </View>
        ) : (
          direcciones.map((d) => (
            <Pressable
              key={d.id}
              style={[estilos.opcionDireccion, direccionElegida === d.id && estilos.opcionDireccionActiva]}
              onPress={() => setDireccionElegida(d.id)}
            >
              <Ionicons
                name={direccionElegida === d.id ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={direccionElegida === d.id ? Colores.primario : Colores.textoClaro}
              />
              <View style={{ flex: 1 }}>
                <Text style={estilos.direccionAlias}>{d.alias}</Text>
                <Text style={estilos.direccionTexto}>{d.calle} {d.numero}, {d.colonia}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <View style={estilos.barraInferior}>
        <Boton
          titulo="Confirmar pedido"
          onPress={manejarConfirmar}
          cargando={confirmando}
          disabled={direcciones.length === 0 || !direccionElegida}
        />
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.fondoApp },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colores.fondoApp },
  contenido: { padding: Espaciado.md, gap: Espaciado.sm, paddingBottom: Espaciado.xl },
  seccionTitulo: { fontSize: 13, fontWeight: '700', color: Colores.textoMedio, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: Espaciado.sm },
  resumenTarjeta: { backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md, borderWidth: 1, borderColor: Colores.bordeGris, gap: 8 },
  filaResumen: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNombre: { flex: 1, fontSize: 13.5, color: Colores.textoMedio, marginRight: Espaciado.sm },
  itemPrecio: { fontSize: 13.5, fontWeight: '600', color: Colores.textoOscuro },
  filaTotal: { borderTopWidth: 1, borderTopColor: Colores.bordeGris, paddingTop: 8, marginTop: 4 },
  totalTexto: { fontSize: 15, fontWeight: '700', color: Colores.textoOscuro },
  totalValor: { fontSize: 18, fontWeight: '800', color: Colores.primario },
  sinDireccion: { alignItems: 'center', gap: Espaciado.sm, paddingVertical: Espaciado.md },
  textoVacio: { fontSize: 13.5, color: Colores.textoClaro, textAlign: 'center' },
  opcionDireccion: {
    flexDirection: 'row', alignItems: 'center', gap: Espaciado.sm,
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    borderWidth: 1.5, borderColor: Colores.bordeGris,
  },
  opcionDireccionActiva: { borderColor: Colores.primario, backgroundColor: Colores.primarioClaro },
  direccionAlias: { fontSize: 14, fontWeight: '700', color: Colores.textoOscuro },
  direccionTexto: { fontSize: 12.5, color: Colores.textoMedio, marginTop: 2 },
  barraInferior: { padding: Espaciado.md, paddingBottom: Espaciado.lg, backgroundColor: Colores.blanco, borderTopWidth: 1, borderTopColor: Colores.bordeGris },
})
