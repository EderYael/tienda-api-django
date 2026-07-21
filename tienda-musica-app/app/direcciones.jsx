import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'
import CampoTexto from '../components/CampoTexto.jsx'
import Boton from '../components/Boton.jsx'
import { Colores, Espaciado, RadioBorde } from '../constants/theme.js'

const FORM_VACIO = {
  alias: '', calle: '', numero: '', colonia: '', ciudad: '',
  estado: '', codigo_postal: '', telefono_contacto: '', referencias: '',
}

export default function Direcciones() {
  const router = useRouter()
  const { showToast } = useToast()
  const [direcciones, setDirecciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  function cargar() {
    setCargando(true)
    api('/api/direcciones/')
      .then(setDirecciones)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  function actualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor })
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }

  function validar() {
    const err = {}
    if (!form.alias.trim()) err.alias = 'Ponle un nombre (ej. "Casa")'
    if (!form.calle.trim()) err.calle = 'Obligatorio'
    if (!form.numero.trim()) err.numero = 'Obligatorio'
    if (!form.colonia.trim()) err.colonia = 'Obligatorio'
    if (!form.ciudad.trim()) err.ciudad = 'Obligatorio'
    if (!form.estado.trim()) err.estado = 'Obligatorio'
    if (!form.codigo_postal.trim()) err.codigo_postal = 'Obligatorio'
    if (!form.telefono_contacto.trim()) err.telefono_contacto = 'Obligatorio'
    return err
  }

  async function guardar() {
    const erroresLocales = validar()
    setErrores(erroresLocales)
    if (Object.keys(erroresLocales).length > 0) return

    setGuardando(true)
    try {
      await api('/api/direcciones/', { method: 'POST', body: form })
      showToast('Dirección guardada.', 'success')
      setForm(FORM_VACIO)
      setMostrarForm(false)
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id) {
    try {
      await api(`/api/direcciones/${id}/`, { method: 'DELETE' })
      showToast('Dirección eliminada.', 'success')
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (cargando) {
    return <View style={estilos.centrado}><ActivityIndicator size="large" color={Colores.primario} /></View>
  }

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      {direcciones.length === 0 && !mostrarForm ? (
        <View style={estilos.vacio}>
          <Ionicons name="location-outline" size={36} color={Colores.textoClaro} />
          <Text style={estilos.textoVacio}>Todavía no tienes direcciones guardadas.</Text>
        </View>
      ) : (
        direcciones.map((d) => (
          <View key={d.id} style={estilos.tarjeta}>
            <View style={estilos.tarjetaEncabezado}>
              <Text style={estilos.alias}>{d.alias}</Text>
              <Pressable onPress={() => eliminar(d.id)}>
                <Ionicons name="trash-outline" size={18} color={Colores.rojoError} />
              </Pressable>
            </View>
            <Text style={estilos.direccionTexto}>
              {d.calle} {d.numero}, {d.colonia}{'\n'}{d.ciudad}, {d.estado}, CP {d.codigo_postal}
            </Text>
            <Text style={estilos.telefono}>Tel: {d.telefono_contacto}</Text>
          </View>
        ))
      )}

      {mostrarForm ? (
        <View style={estilos.formulario}>
          <CampoTexto etiqueta="Nombre de la dirección" valor={form.alias} onChangeText={(t) => actualizarCampo('alias', t)} placeholder="Casa, Trabajo..." error={errores.alias} />
          <CampoTexto etiqueta="Calle" valor={form.calle} onChangeText={(t) => actualizarCampo('calle', t)} error={errores.calle} />
          <CampoTexto etiqueta="Número" valor={form.numero} onChangeText={(t) => actualizarCampo('numero', t)} keyboardType="numbers-and-punctuation" error={errores.numero} />
          <CampoTexto etiqueta="Colonia" valor={form.colonia} onChangeText={(t) => actualizarCampo('colonia', t)} error={errores.colonia} />
          <CampoTexto etiqueta="Ciudad" valor={form.ciudad} onChangeText={(t) => actualizarCampo('ciudad', t)} error={errores.ciudad} />
          <CampoTexto etiqueta="Estado" valor={form.estado} onChangeText={(t) => actualizarCampo('estado', t)} error={errores.estado} />
          <CampoTexto etiqueta="Código postal" valor={form.codigo_postal} onChangeText={(t) => actualizarCampo('codigo_postal', t)} keyboardType="number-pad" error={errores.codigo_postal} />
          <CampoTexto etiqueta="Teléfono de contacto" valor={form.telefono_contacto} onChangeText={(t) => actualizarCampo('telefono_contacto', t)} keyboardType="phone-pad" error={errores.telefono_contacto} />
          <CampoTexto etiqueta="Referencias (opcional)" valor={form.referencias} onChangeText={(t) => actualizarCampo('referencias', t)} multiline />

          <View style={estilos.botonesForm}>
            <View style={{ flex: 1 }}>
              <Boton titulo="Cancelar" variante="secundario" onPress={() => { setMostrarForm(false); setForm(FORM_VACIO); setErrores({}) }} />
            </View>
            <View style={{ flex: 1 }}>
              <Boton titulo="Guardar" onPress={guardar} cargando={guardando} />
            </View>
          </View>
        </View>
      ) : (
        <Boton titulo="+ Agregar dirección" variante="secundario" onPress={() => setMostrarForm(true)} />
      )}
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colores.fondoApp },
  contenido: { padding: Espaciado.md, gap: Espaciado.sm },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colores.fondoApp },
  vacio: { alignItems: 'center', justifyContent: 'center', gap: Espaciado.sm, paddingVertical: Espaciado.xl },
  textoVacio: { fontSize: 13.5, color: Colores.textoClaro, textAlign: 'center' },
  tarjeta: {
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    borderWidth: 1, borderColor: Colores.bordeGris, gap: 4,
  },
  tarjetaEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alias: { fontSize: 15, fontWeight: '700', color: Colores.textoOscuro },
  direccionTexto: { fontSize: 13.5, color: Colores.textoMedio, lineHeight: 19 },
  telefono: { fontSize: 12.5, color: Colores.textoClaro },
  formulario: { gap: Espaciado.sm, backgroundColor: Colores.blanco, padding: Espaciado.md, borderRadius: RadioBorde.tarjeta, borderWidth: 1, borderColor: Colores.bordeGris },
  botonesForm: { flexDirection: 'row', gap: Espaciado.sm, marginTop: Espaciado.xs },
})
