import React from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colores, Espaciado, RadioBorde } from '../constants/theme.js'

export default function ProductoCard({ producto, urlImagen, onPress }) {
  const sinStock = producto.stock <= 0

  return (
    <Pressable
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.tarjetaPresionada]}
      onPress={onPress}
    >
      <View style={estilos.contenedorImagen}>
        {urlImagen ? (
          <Image source={{ uri: urlImagen }} style={estilos.imagen} resizeMode="cover" />
        ) : (
          <View style={[estilos.imagen, estilos.imagenVacia]}>
            <Ionicons name="image-outline" size={28} color={Colores.textoClaro} />
          </View>
        )}
        {sinStock && (
          <View style={estilos.badgeAgotado}>
            <Text style={estilos.badgeAgotadoTexto}>Agotado</Text>
          </View>
        )}
      </View>

      <View style={estilos.info}>
        <Text style={estilos.nombre} numberOfLines={2}>{producto.nombre}</Text>
        <Text style={estilos.precio}>${parseFloat(producto.precio).toFixed(2)}</Text>
      </View>
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  tarjeta: {
    flex: 1,
    backgroundColor: Colores.blanco,
    borderRadius: RadioBorde.tarjeta,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colores.bordeGris,
  },
  tarjetaPresionada: { opacity: 0.85 },
  contenedorImagen: { width: '100%', aspectRatio: 1, backgroundColor: Colores.fondoApp },
  imagen: { width: '100%', height: '100%' },
  imagenVacia: { alignItems: 'center', justifyContent: 'center' },
  badgeAgotado: {
    position: 'absolute', top: Espaciado.sm, right: Espaciado.sm,
    backgroundColor: Colores.rojoError, borderRadius: RadioBorde.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeAgotadoTexto: { color: Colores.blanco, fontSize: 10.5, fontWeight: '700' },
  info: { padding: Espaciado.sm + 2, gap: 3 },
  nombre: { fontSize: 13.5, fontWeight: '600', color: Colores.textoOscuro, minHeight: 34 },
  precio: { fontSize: 15, fontWeight: '800', color: Colores.primario },
})
