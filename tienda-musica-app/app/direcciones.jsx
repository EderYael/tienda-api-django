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

const ICONO_POR_ALIAS = (alias = '') => {
  const a = alias.toLowerCase()
  if (a.includes('casa') || a.includes('hogar')) return 'home'
  if (a.includes('trabajo') || a.includes('oficina')) return 'briefcase'
  return 'location'
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
          <View style={estilos.iconoVacioWrap}>
            <Ionicons name="location-outline" size={32} color={Colores.primario} />
          </View>
          <Text style={estilos.tituloVacio}>Sin direcciones guardadas</Text>
          <Text style={estilos.textoVacio}>Agrega una para poder confirmar tus pedidos.</Text>
        </View>
      ) : (
        direcciones.map((d) => (
          <View key={d.id} style={[estilos.tarjeta, d.es_principal && estilos.tarjetaPrincipal]}>
            <View style={estilos.tarjetaEncabezado}>
              <View style={estilos.aliasFila}>
                <View style={[estilos.iconoAliasWrap, d.es_principal && estilos.iconoAliasWrapPrincipal]}>
                  <Ionicons name={ICONO_POR_ALIAS(d.alias)} size={16} color={d.es_principal ? Colores.blanco : Colores.primario} />
                </View>
                <View>
                  <Text style={estilos.alias}>{d.alias}</Text>
                  {d.es_principal && (
                    <View style={estilos.badgePrincipal}>
                      <Text style={estilos.badgePrincipalTexto}>PRINCIPAL</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={estilos.accionesFila}>
                <Pressable onPress={() => abrirEditar(d)} style={estilos.iconoAccion} hitSlop={8}>
                  <Ionicons name="pencil-outline" size={17} color={Colores.textoMedio} />
                </Pressable>
                <Pressable onPress={() => eliminar(d.id)} style={estilos.iconoAccion} hitSlop={8}>
                  <Ionicons name="trash-outline" size={17} color={Colores.rojoError} />
                </Pressable>
              </View>
            </View>

            <View style={estilos.separadorFino} />

            <Text style={estilos.direccionTexto}>
              {d.calle} {d.numero}, {d.colonia}{'\n'}{d.ciudad}, {d.estado}, CP {d.codigo_postal}
            </Text>
            <View style={estilos.telefonoFila}>
              <Ionicons name="call-outline" size={12} color={Colores.textoClaro} />
              <Text style={estilos.telefono}>{d.telefono_contacto}</Text>
            </View>

            {!d.es_principal && (
              <Pressable
                onPress={() => marcarPrincipal(d.id)}
                disabled={marcandoPrincipalId === d.id}
                style={estilos.enlaceMarcarPrincipal}
              >
                <Ionicons name="star-outline" size={13} color={Colores.primario} />
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
          <View style={estilos.formularioEncabezado}>
            <View style={estilos.iconoFormWrap}>
              <Ionicons name={editandoId ? 'pencil' : 'add'} size={18} color={Colores.blanco} />
            </View>
            <Text style={estilos.formularioTitulo}>{editandoId ? 'Editar dirección' : 'Nueva dirección'}</Text>
          </View>

          <CampoTexto etiqueta="Nombre de la dirección" valor={form.alias} onChangeText={(t) => actualizarCampo('alias', t)} placeholder="Casa, Trabajo..." error={errores.alias} />

          <Text style={estilos.seccionForm}>Ubicación</Text>
          <View style={estilos.filaDoble}>
            <View style={{ flex: 2 }}>
              <CampoTexto etiqueta="Calle" valor={form.calle} onChangeText={(t) => actualizarCampo('calle', t)} error={errores.calle} />
            </View>
            <View style={{ flex: 1 }}>
              <CampoTexto etiqueta="Número" valor={form.numero} onChangeText={(t) => actualizarCampo('numero', t)} keyboardType="numbers-and-punctuation" error={errores.numero} />
            </View>
          </View>
          <View style={estilos.filaDoble}>
            <View style={{ flex: 1 }}>
              <CampoTexto etiqueta="Colonia" valor={form.colonia} onChangeText={(t) => actualizarCampo('colonia', t)} error={errores.colonia} />
            </View>
            <View style={{ flex: 1 }}>
              <CampoTexto etiqueta="Ciudad" valor={form.ciudad} onChangeText={(t) => actualizarCampo('ciudad', t)} error={errores.ciudad} />
            </View>
          </View>
          <View style={estilos.filaDoble}>
            <View style={{ flex: 1 }}>
              <CampoTexto etiqueta="Estado" valor={form.estado} onChangeText={(t) => actualizarCampo('estado', t)} error={errores.estado} />
            </View>
            <View style={{ flex: 1 }}>
              <CampoTexto etiqueta="Código postal" valor={form.codigo_postal} onChangeText={(t) => actualizarCampo('codigo_postal', t)} keyboardType="number-pad" error={errores.codigo_postal} />
            </View>
          </View>

          <Text style={estilos.seccionForm}>Contacto</Text>
          <CampoTexto etiqueta="Teléfono de contacto" valor={form.telefono_contacto} onChangeText={(t) => actualizarCampo('telefono_contacto', t)} keyboardType="phone-pad" error={errores.telefono_contacto} />
          <CampoTexto etiqueta="Referencias (opcional)" valor={form.referencias} onChangeText={(t) => actualizarCampo('referencias', t)} placeholder="Portón negro, casa de dos pisos..." multiline />

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
  vacio: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Espaciado.xl },
  iconoVacioWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colores.primarioClaro, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tituloVacio: { fontSize: 16, fontWeight: '700', color: Colores.textoOscuro },
  textoVacio: { fontSize: 13.5, color: Colores.textoClaro, textAlign: 'center' },
  tarjeta: {
    backgroundColor: Colores.blanco, borderRadius: RadioBorde.tarjeta, padding: Espaciado.md,
    borderWidth: 1, borderColor: Colores.bordeGris, gap: 6,
  },
  tarjetaPrincipal: { borderColor: Colores.primario, borderWidth: 1.5 },
  tarjetaEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  aliasFila: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconoAliasWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colores.primarioClaro,
    alignItems: 'center', justifyContent: 'center',
  },
  iconoAliasWrapPrincipal: { backgroundColor: Colores.primario },
  alias: { fontSize: 15, fontWeight: '700', color: Colores.textoOscuro },
  badgePrincipal: { backgroundColor: Colores.primarioClaro, borderRadius: RadioBorde.pill, paddingHorizontal: 7, paddingVertical: 1, marginTop: 2, alignSelf: 'flex-start' },
  badgePrincipalTexto: { fontSize: 9.5, fontWeight: '800', color: Colores.primario, letterSpacing: 0.3 },
  accionesFila: { flexDirection: 'row', gap: 4 },
  iconoAccion: { padding: 4 },
  separadorFino: { height: 1, backgroundColor: Colores.bordeGris },
  direccionTexto: { fontSize: 13.5, color: Colores.textoMedio, lineHeight: 19 },
  telefonoFila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  telefono: { fontSize: 12.5, color: Colores.textoClaro },
  enlaceMarcarPrincipal: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  enlaceMarcarPrincipalTexto: { fontSize: 12.5, fontWeight: '700', color: Colores.primario },
  formulario: { gap: Espaciado.sm, backgroundColor: Colores.blanco, padding: Espaciado.md, borderRadius: RadioBorde.tarjeta, borderWidth: 1, borderColor: Colores.bordeGris },
  formularioEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  iconoFormWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colores.primario, alignItems: 'center', justifyContent: 'center' },
  formularioTitulo: { fontSize: 16, fontWeight: '700', color: Colores.textoOscuro },
  seccionForm: { fontSize: 11.5, fontWeight: '700', color: Colores.textoClaro, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  filaDoble: { flexDirection: 'row', gap: Espaciado.sm },
  botonesForm: { flexDirection: 'row', gap: Espaciado.sm, marginTop: Espaciado.xs },
})
