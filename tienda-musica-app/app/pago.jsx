import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'
import Boton from '../components/Boton.jsx'
import { Colores, Espaciado, RadioBorde } from '../constants/theme.js'

export default function Pago() {
  const { pedidoId, metodoPago } = useLocalSearchParams()
  const router = useRouter()
  const { showToast } = useToast()

  const [numeroTarjeta, setNumeroTarjeta] = useState('')
  const [procesando, setProcesando] = useState(false)

  async function pagarConTarjeta() {
    if (numeroTarjeta.replace(/\s/g, '').length < 12) {
      showToast('Ingresa un número de tarjeta válido', 'error')
      return
    }
    setProcesando(true)
    try {
      await api(`/api/pedidos/${pedidoId}/pagar/`, {
        method: 'POST',
        body: { numero_tarjeta: numeroTarjeta },
      })
      showToast('¡Pago aprobado!', 'success')
      router.replace('/pedidos')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setProcesando(false)
    }
  }

  if (metodoPago === 'deposito') {
    return (
      <View style={estilos.pantalla}>
        <ScrollView contentContainerStyle={estilos.contenido}>
          <View style={estilos.iconoCentro}>
            <Ionicons name="business-outline" size={48} color={Colores.primario} />
          </View>
          <Text style={estilos.titulo}>Paga por depósito</Text>
          <Text style={estilos.subtitulo}>
            Tu pedido #{pedidoId} quedó registrado. Realiza el depósito con estos datos y espera la
            confirmación del administrador (puede tardar unas horas).
          </Text>

          <View style={estilos.tarjetaDatos}>
            <FilaDato etiqueta="Banco" valor="Banco Ficticio Escolar" />
            <FilaDato etiqueta="Cuenta" valor="0123 4567 8901 2345" />
            <FilaDato etiqueta="CLABE" valor="012345678901234567" />
            <FilaDato etiqueta="A nombre de" valor="Tienda Música S.A. de C.V." />
            <FilaDato etiqueta="Referencia" valor={`PEDIDO-${pedidoId}`} />
          </View>

          <Text style={estilos.nota}>
            Este es un depósito simulado para fines escolares, no se procesa ningún cobro real.
          </Text>
        </ScrollView>

        <View style={estilos.barraInferior}>
          <Boton titulo="Ir a mis pedidos" onPress={() => router.replace('/pedidos')} />
        </View>
      </View>
    )
  }

  return (
    <View style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={estilos.iconoCentro}>
          <Ionicons name="card-outline" size={48} color={Colores.primario} />
        </View>
        <Text style={estilos.titulo}>Pago con tarjeta</Text>
        <Text style={estilos.subtitulo}>
          Pedido #{pedidoId} — esto es un simulador, no se realiza ningún cargo real.
        </Text>

        <Text style={estilos.etiquetaCampo}>Número de tarjeta</Text>
        <View style={estilos.inputTarjeta}>
          <Ionicons name="card" size={18} color={Colores.textoClaro} />
          <Text
            style={estilos.inputTexto}
            onPress={() => {}}
          >
            {numeroTarjeta || 'Escribe el número aquí abajo'}
          </Text>
        </View>

        {/* Campo de texto real para capturar el número */}
        <CampoTarjeta value={numeroTarjeta} onChangeText={setNumeroTarjeta} />

        <Text style={estilos.nota}>
          Simulación: cualquier tarjeta funciona, excepto una terminada en "0000" (se rechaza a propósito
          para mostrar el caso de error).
        </Text>
      </ScrollView>

      <View style={estilos.barraInferior}>
        <Boton titulo="Pagar ahora" onPress={pagarConTarjeta} cargando={procesando} />
      </View>
    </View>
  )
}

function FilaDato({ etiqueta, valor }) {
  return (
    <View style={estilos.filaDato}>
      <Text style={estilos.etiquetaDato}>{etiqueta}</Text>
      <Text style={estilos.valorDato}>{valor}</Text>
    </View>
  )
}

// Input separado para no pelear con el TextInput dentro de un ScrollView con estilos complejos
function CampoTarjeta({ value, onChangeText }) {
  const { TextInput } = require('react-native')
  return (
    <TextInput
      style={estilos.textInput}
      placeholder="4111 1111 1111 1111"
      keyboardType="number-pad"
      value={value}
      onChangeText={onChangeText}
      maxLength={19}
    />
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.fondoApp },
  contenido: { padding: Espaciado.md, gap: Espaciado.sm, paddingBottom: Espaciado.xl },
  iconoCentro: { alignItems: 'center', marginTop: Espaciado.md, marginBottom: Espaciado.xs },
  titulo: { fontSize: 19, fontWeight: '800', color: Colores.textoOscuro, textAlign: 'center' },
  subtitulo: { fontSize: 13.5, color: Colores.textoMedio, textAlign: 'center', marginBottom: Espaciado.sm },
  etiquetaCampo: { fontSize: 12.5, fontWeight: '700', color: Colores.textoMedio, marginTop: Espaciado.sm },
  inputTarjeta: { display: 'none' },
  inputTexto: { display: 'none' },
  textInput: {
    backgroundColor: Colores.blanco, borderWidth: 1.5, borderColor: Colores.bordeGris,
    borderRadius: RadioBorde.tarjeta, padding: Espaciado.md, fontSize: 16, letterSpacing: 1,
  },
  tarjetaDatos: {
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    borderWidth: 1, borderColor: Colores.bordeGris, gap: 10, marginTop: Espaciado.sm,
  },
  filaDato: { flexDirection: 'row', justifyContent: 'space-between' },
  etiquetaDato: { fontSize: 13, color: Colores.textoMedio },
  valorDato: { fontSize: 13, fontWeight: '700', color: Colores.textoOscuro },
  nota: { fontSize: 12, color: Colores.textoClaro, textAlign: 'center', marginTop: Espaciado.sm },
  barraInferior: { padding: Espaciado.md, paddingBottom: Espaciado.lg, backgroundColor: Colores.blanco, borderTopWidth: 1, borderTopColor: Colores.bordeGris },
})
