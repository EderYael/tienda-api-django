import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
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
  const { showToast } = useToast()
  const [direcciones, setDirecciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [marcandoPrincipalId, setMarcandoPrincipalId] = useState(null)

  function cargar({ mostrarSpinnerGrande = true } = {}) {
    if (mostrarSpinnerGrande) setCargando(true)
    api('/api/direcciones/')
      .then(setDirecciones)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => { setCargando(false); setRefrescando(false) })
  }

  useEffect(() => { cargar() }, [])

  function onRefrescar() {
    setRefrescando(true)
    cargar({ mostrarSpinnerGrande: false })
  }

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

  function abrirNueva() {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setErrores({})
    setMostrarForm(true)
  }

  function abrirEditar(direccion) {
    setEditandoId(direccion.id)
    setForm({
      alias: direccion.alias, calle: direccion.calle, numero: direccion.numero,
      colonia: direccion.colonia, ciudad: direccion.ciudad, estado: direccion.estado,
      codigo_postal: direccion.codigo_postal, telefono_contacto: direccion.telefono_contacto,
      referencias: direccion.referencias || '',
    })
    setErrores({})
    setMostrarForm(true)
  }

  async function guardar() {
    const erroresLocales = validar()
    setErrores(erroresLocales)
    if (Object.keys(erroresLocales).length > 0) return

    setGuardando(true)
    try {
      if (editandoId) {
        await api(`/api/direcciones/${editandoId}/`, { method: 'PUT', body: form })
        showToast('Dirección actualizada.', 'success')
      } else {
        await api('/api/direcciones/', { method: 'POST', body: form })
        showToast('Dirección guardada.', 'success')
      }
      setForm(FORM_VACIO)
      setEditandoId(null)
      setMostrarForm(false)
      cargar({ mostrarSpinnerGrande: false })
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
      cargar({ mostrarSpinnerGrande: false })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function marcarPrincipal(id) {
    setMarcandoPrincipalId(id)
    try {
      await api(`/api/direcciones/${id}/marcar-principal/`, { method: 'POST' })
      showToast('Dirección principal actualizada.', 'success')
      cargar({ mostrarSpinnerGrande: false })
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setMarcandoPrincipalId(null)
    }
  }

  if (cargando) {
    return <View style={estilos.centrado}><ActivityIndicator size="large" color={Colores.primario} /></View>
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor={Colores.primario} />}
    >
      {direcciones.length === 0 && !mostrarForm ? (
        <View style={estilos.vacio}>
          <Ionicons name="location-outline" size={36} color={Colores.textoClaro} />
          <Text style={estilos.textoVacio}>Todavía no tienes direcciones guardadas.</Text>
        </View>
      ) : (
        direcciones.map((d) => (
          <View key={d.id} style={estilos.tarjeta}>
            <View style={estilos.tarjetaEncabezado}>
              <View style={estilos.aliasFila}>
                <Text style={estilos.alias}>{d.alias}</Text>
                {d.es_principal && (
                  <View style={estilos.badgePrincipal}>
                    <Text style={estilos.badgePrincipalTexto}>Principal</Text>
                  </View>
                )}
              </View>
              <View style={estilos.accionesFila}>
                <Pressable onPress={() => abrirEditar(d)} style={estilos.iconoAccion}>
                  <Ionicons name="pencil-outline" size={17} color={Colores.textoMedio} />
                </Pressable>
                <Pressable onPress={() => eliminar(d.id)} style={estilos.iconoAccion}>
                  <Ionicons name="trash-outline" size={17} color={Colores.rojoError} />
                </Pressable>
              </View>
            </View>
            <Text style={estilos.direccionTexto}>
              {d.calle} {d.numero}, {d.colonia}{'\n'}{d.ciudad}, {d.estado}, CP {d.codigo_postal}
            </Text>
            <Text style={estilos.telefono}>Tel: {d.telefono_contacto}</Text>

            {!d.es_principal && (
              <Pressable
                onPress={() => marcarPrincipal(d.id)}
                disabled={marcandoPrincipalId === d.id}
                style={estilos.enlaceMarcarPrincipal}
              >
                <Text style={estilos.enlaceMarcarPrincipalTexto}>
                  {marcandoPrincipalId === d.id ? 'Marcando...' : 'Marcar como principal'}
                </Text>
              </Pressable>
            )}
          </View>
        ))
      )}

      {mostrarForm ? (
        <View style={estilos.formulario}>
          <Text style={estilos.formularioTitulo}>{editandoId ? 'Editar dirección' : 'Nueva dirección'}</Text>
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
              <Boton titulo="Cancelar" variante="secundario" onPress={() => { setMostrarForm(false); setEditandoId(null); setForm(FORM_VACIO); setErrores({}) }} />
            </View>
            <View style={{ flex: 1 }}>
              <Boton titulo="Guardar" onPress={guardar} cargando={guardando} />
            </View>
          </View>
        </View>
      ) : (
        <Boton titulo="+ Agregar dirección" variante="secundario" onPress={abrirNueva} />
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
  aliasFila: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  alias: { fontSize: 15, fontWeight: '700', color: Colores.textoOscuro },
  badgePrincipal: { backgroundColor: Colores.primarioClaro, borderRadius: RadioBorde.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgePrincipalTexto: { fontSize: 10.5, fontWeight: '700', color: Colores.primario },
  accionesFila: { flexDirection: 'row', gap: 4 },
  iconoAccion: { padding: 4 },
  direccionTexto: { fontSize: 13.5, color: Colores.textoMedio, lineHeight: 19 },
  telefono: { fontSize: 12.5, color: Colores.textoClaro },
  enlaceMarcarPrincipal: { marginTop: 6 },
  enlaceMarcarPrincipalTexto: { fontSize: 12.5, fontWeight: '700', color: Colores.primario },
  formulario: { gap: Espaciado.sm, backgroundColor: Colores.blanco, padding: Espaciado.md, borderRadius: RadioBorde.tarjeta, borderWidth: 1, borderColor: Colores.bordeGris },
  formularioTitulo: { fontSize: 15, fontWeight: '700', color: Colores.textoOscuro, marginBottom: 4 },
  botonesForm: { flexDirection: 'row', gap: Espaciado.sm, marginTop: Espaciado.xs },
})
