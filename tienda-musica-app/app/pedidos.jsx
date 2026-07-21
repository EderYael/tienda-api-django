import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../utils/api.js'
import { Colores, Espaciado, RadioBorde } from '../constants/theme.js'

const COLOR_ESTADO = {
  pendiente: { fondo: Colores.naranjaFondo, texto: '#92400e' },
  pagado: { fondo: Colores.primarioClaro, texto: Colores.primarioOscuro },
  enviado: { fondo: Colores.verdeFondo, texto: '#047857' },
  cancelado: { fondo: Colores.rojoFondo, texto: '#b91c1c' },
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/pedidos/')
      .then(setPedidos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) {
    return <View style={estilos.centrado}><ActivityIndicator size="large" color={Colores.primario} /></View>
  }

  if (error) {
    return <View style={estilos.centrado}><Text style={estilos.textoVacio}>{error}</Text></View>
  }

  return (
    <FlatList
      style={estilos.pantalla}
      data={pedidos.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha))}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={estilos.lista}
      ListEmptyComponent={
        <View style={estilos.centrado}>
          <Ionicons name="receipt-outline" size={36} color={Colores.textoClaro} />
          <Text style={estilos.textoVacio}>Todavía no tienes pedidos.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const colores = COLOR_ESTADO[item.estado] || { fondo: Colores.fondoApp, texto: Colores.textoMedio }
        const abierto = expandido === item.id
        return (
          <Pressable style={estilos.tarjeta} onPress={() => setExpandido(abierto ? null : item.id)}>
            <View style={estilos.encabezadoTarjeta}>
              <Text style={estilos.numeroPedido}>Pedido #{item.id}</Text>
              <View style={[estilos.badge, { backgroundColor: colores.fondo }]}>
                <Text style={[estilos.badgeTexto, { color: colores.texto }]}>{item.estado}</Text>
              </View>
            </View>
            <Text style={estilos.fecha}>{new Date(item.fecha).toLocaleString('es-MX')}</Text>
            <View style={estilos.filaTotal}>
              <Text style={estilos.total}>${parseFloat(item.total).toFixed(2)}</Text>
              <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={18} color={Colores.textoClaro} />
            </View>

            {abierto && (
              <View style={estilos.detalles}>
                {item.detalles.map((d) => (
                  <View key={d.id} style={estilos.filaDetalle}>
                    <Text style={estilos.detalleTexto}>Producto #{d.producto} · x{d.cantidad}</Text>
                    <Text style={estilos.detalleTexto}>${parseFloat(d.subtotal).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        )
      }}
    />
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.fondoApp },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaciado.sm, backgroundColor: Colores.fondoApp, padding: Espaciado.lg },
  textoVacio: { fontSize: 13.5, color: Colores.textoClaro, textAlign: 'center' },
  lista: { padding: Espaciado.md, gap: Espaciado.sm },
  tarjeta: {
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    borderWidth: 1, borderColor: Colores.bordeGris, gap: 4,
  },
  encabezadoTarjeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numeroPedido: { fontSize: 15, fontWeight: '700', color: Colores.textoOscuro },
  badge: { borderRadius: RadioBorde.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTexto: { fontSize: 11.5, fontWeight: '700', textTransform: 'capitalize' },
  fecha: { fontSize: 12.5, color: Colores.textoClaro },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  total: { fontSize: 17, fontWeight: '800', color: Colores.primario },
  detalles: { marginTop: Espaciado.sm, paddingTop: Espaciado.sm, borderTopWidth: 1, borderTopColor: Colores.bordeGris, gap: 4 },
  filaDetalle: { flexDirection: 'row', justifyContent: 'space-between' },
  detalleTexto: { fontSize: 12.5, color: Colores.textoMedio },
})
