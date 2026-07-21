import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colores, Espaciado, RadioBorde } from '../constants/theme.js'

export default function CampoTexto({
  etiqueta, valor, onChangeText, placeholder, esPassword = false,
  error, keyboardType = 'default', autoCapitalize = 'sentences', multiline = false,
}) {
  const [mostrarPassword, setMostrarPassword] = useState(false)

  return (
    <View style={estilos.contenedor}>
      {etiqueta && <Text style={estilos.etiqueta}>{etiqueta}</Text>}
      <View style={estilos.envoltura}>
        <TextInput
          value={valor}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colores.textoClaro}
          secureTextEntry={esPassword && !mostrarPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          style={[
            estilos.input,
            multiline && estilos.inputMultilinea,
            error && estilos.inputError,
          ]}
        />
        {esPassword && (
          <Pressable onPress={() => setMostrarPassword(!mostrarPassword)} style={estilos.iconoOjo}>
            <Ionicons name={mostrarPassword ? 'eye-off' : 'eye'} size={19} color={Colores.textoClaro} />
          </Pressable>
        )}
      </View>
      {error && <Text style={estilos.textoError}>{error}</Text>}
    </View>
  )
}

const estilos = StyleSheet.create({
  contenedor: { gap: 6 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: Colores.textoMedio },
  envoltura: { position: 'relative', justifyContent: 'center' },
  input: {
    borderWidth: 1.5, borderColor: Colores.bordeGris, borderRadius: RadioBorde.boton,
    paddingHorizontal: Espaciado.md, paddingVertical: 12, fontSize: 15, color: Colores.textoOscuro,
    backgroundColor: Colores.blanco,
  },
  inputMultilinea: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  inputError: { borderColor: Colores.rojoError },
  iconoOjo: { position: 'absolute', right: 14, padding: 4 },
  textoError: { fontSize: 12, color: Colores.rojoError, fontWeight: '500' },
})
