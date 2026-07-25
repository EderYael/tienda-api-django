import React, { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'
import Boton from '../components/Boton.jsx'
import { Colores, Espaciado, RadioBorde } from '../constants/theme.js'

export default function PagarTarjeta() {
  const { pedido_id } = useLocalSearchParams()
  const router = useRouter()
  const { showToast } = useToast()

  const [abriendo, setAbriendo] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [resultado, setResultado] = useState(null) // 'pagado' | 'pendiente' | null

  async function pagarConStripe() {
    setAbriendo(true)
    setResultado(null)
    try {
      const { checkout_url } = await api(`/api/pedidos/${pedido_id}/iniciar-pago-stripe/`, { method: 'POST' })

      // Abre la página segura de Stripe dentro de un navegador embebido.
      // Nunca vemos el número de tarjeta: todo el cobro pasa en el dominio
      // de Stripe. Cuando el usuario cierra esa ventana (haya pagado o no),
      // seguimos aquí abajo.
      await WebBrowser.openBrowserAsync(checkout_url)

      // Nunca confiamos en "cerró la ventana" = "pagó": le preguntamos al
      // backend, que a su vez le pregunta a Stripe el estado real.
      setVerificando(true)
      const verificacion = await api(`/api/pedidos/${pedido_id}/verificar-pago-stripe/`, { method: 'POST' })
      if (verificacion.estado === 'pagado') {
        setResultado('pagado')
        showToast('¡Pago confirmado!', 'success')
      } else {
        setResultado('pendiente')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAbriendo(false)
      setVerificando(false)
    }
  }

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.contenido}>
        <View style={estilos.iconoWrap}>
          <Ionicons name="card" size={36} color={Colores.primario} />
        </View>

        <Text style={estilos.titulo}>Pago con tarjeta</Text>
        <Text style={estilos.descripcion}>
          Vas a completar tu pago en la página segura de Stripe. Ahí ingresas tu tarjeta;
          nosotros nunca la vemos.
        </Text>

        <View style={estilos.avisoPrueba}>
          <Ionicons name="information-circle-outline" size={17} color={Colores.textoMedio} />
          <Text style={estilos.avisoPruebaTexto}>
            Modo de prueba: usa 4242 4242 4242 4242 con cualquier fecha futura y CVV
            para un pago aprobado.
          </Text>
        </View>

        {resultado === 'pagado' && (
          <View style={[estilos.resultado, estilos.resultadoExito]}>
            <Ionicons name="checkmark-circle" size={20} color={Colores.verdeExito} />
            <Text style={estilos.resultadoTextoExito}>¡Pago confirmado! Tu pedido ya va en camino.</Text>
          </View>
        )}
        {resultado === 'pendiente' && (
          <View style={[estilos.resultado, estilos.resultadoPendiente]}>
            <Ionicons name="time-outline" size={20} color="#92400e" />
            <Text style={estilos.resultadoTextoPendiente}>
              No detectamos el pago todavía. Si ya pagaste, puede tardar unos segundos —
              intenta verificar de nuevo.
            </Text>
          </View>
        )}

        {(abriendo || verificando) && (
          <View style={estilos.cargandoFila}>
            <ActivityIndicator size="small" color={Colores.primario} />
            <Text style={estilos.cargandoTexto}>
              {verificando ? 'Verificando tu pago...' : 'Abriendo Stripe...'}
            </Text>
          </View>
        )}
      </View>

      <View style={estilos.barraInferior}>
        {resultado === 'pagado' ? (
          <Boton titulo="Ver mis pedidos" onPress={() => router.replace('/pedidos')} />
        ) : (
          <Boton
            titulo={resultado === 'pendiente' ? 'Intentar de nuevo' : 'Pagar con Stripe'}
            onPress={pagarConStripe}
            cargando={abriendo || verificando}
          />
        )}
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.fondoApp },
  contenido: { flex: 1, padding: Espaciado.lg, alignItems: 'center', gap: Espaciado.sm, paddingTop: Espaciado.xl },
  iconoWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colores.primarioClaro,
    alignItems: 'center', justifyContent: 'center', marginBottom: Espaciado.sm,
  },
  titulo: { fontSize: 20, fontWeight: '800', color: Colores.textoOscuro },
  descripcion: { fontSize: 14, color: Colores.textoMedio, textAlign: 'center', lineHeight: 20 },
  avisoPrueba: {
    flexDirection: 'row', gap: Espaciado.xs, backgroundColor: Colores.blanco,
    borderRadius: RadioBorde.tarjeta, padding: Espaciado.sm, marginTop: Espaciado.sm,
    borderWidth: 1, borderColor: Colores.bordeGris,
  },
  avisoPruebaTexto: { flex: 1, fontSize: 12, color: Colores.textoMedio, lineHeight: 17 },
  resultado: {
    flexDirection: 'row', gap: Espaciado.xs, alignItems: 'flex-start', width: '100%',
    borderRadius: RadioBorde.tarjeta, padding: Espaciado.md, marginTop: Espaciado.sm,
  },
  resultadoExito: { backgroundColor: Colores.verdeFondo },
  resultadoPendiente: { backgroundColor: Colores.naranjaFondo },
  resultadoTextoExito: { flex: 1, fontSize: 13.5, color: '#047857', fontWeight: '600', lineHeight: 19 },
  resultadoTextoPendiente: { flex: 1, fontSize: 13.5, color: '#92400e', fontWeight: '600', lineHeight: 19 },
  cargandoFila: { flexDirection: 'row', alignItems: 'center', gap: Espaciado.xs, marginTop: Espaciado.md },
  cargandoTexto: { fontSize: 13, color: Colores.textoMedio },
  barraInferior: {
    padding: Espaciado.md, paddingBottom: Espaciado.lg, backgroundColor: Colores.blanco,
    borderTopWidth: 1, borderTopColor: Colores.bordeGris,
  },
})
