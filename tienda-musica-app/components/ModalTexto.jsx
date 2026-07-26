import React, { useState } from 'react'
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native'
import CampoTexto from './CampoTexto.jsx'
import Boton from './Boton.jsx'
import { Colores, Espaciado, RadioBorde } from '../constants/theme.js'

/**
 * Modal simple con un campo de texto y dos botones. Se usa para pedir un
 * motivo (ej. cancelar un pedido) — no se puede usar Alert.prompt de React
 * Native porque solo existe en iOS, no en Android.
 */
export default function ModalTexto({ visible, titulo, placeholder, textoBoton, onCancelar, onConfirmar, cargando }) {
  const [valor, setValor] = useState('')

  function confirmar() {
    if (!valor.trim()) return
    onConfirmar(valor.trim())
  }

  function cerrar() {
    setValor('')
    onCancelar()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <View style={estilos.fondo}>
        <View style={estilos.tarjeta}>
          <Text style={estilos.titulo}>{titulo}</Text>
          <CampoTexto valor={valor} onChangeText={setValor} placeholder={placeholder} multiline />
          <View style={estilos.botones}>
            <View style={{ flex: 1 }}>
              <Boton titulo="Cancelar" variante="secundario" onPress={cerrar} disabled={cargando} />
            </View>
            <View style={{ flex: 1 }}>
              <Boton titulo={textoBoton || 'Confirmar'} variante="peligro" onPress={confirmar} cargando={cargando} disabled={!valor.trim()} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', alignItems: 'center', justifyContent: 'center', padding: Espaciado.lg },
  tarjeta: { width: '100%', backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.lg, gap: Espaciado.sm },
  titulo: { fontSize: 16, fontWeight: '700', color: Colores.textoOscuro, marginBottom: 4 },
  botones: { flexDirection: 'row', gap: Espaciado.sm, marginTop: Espaciado.xs },
})
