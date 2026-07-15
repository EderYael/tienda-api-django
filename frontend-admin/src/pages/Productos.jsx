import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, getBaseUrl } from '../api.js'
import { useToast } from '../context/ToastContext.jsx'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Spinner from '../components/Spinner.jsx'
import { SkeletonFilas } from '../components/Skeleton.jsx'
import { validarProducto, erroresDeApi } from '../utils/validacion.js'

const VACIO = { nombre: '', descripcion: '', precio: '', stock: '', categoria: '' }

export default function Productos() {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const { showToast } = useToast()

  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const [confirmando, setConfirmando] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  async function cargar() {
    setCargandoLista(true)
    try {
      const urlProductos = searchQuery
        ? `/api/productos/?search=${encodeURIComponent(searchQuery)}`
        : '/api/productos/'
      const [prods, cats] = await Promise.all([
        api(urlProductos),
        api('/api/categorias/')
      ])
      setProductos(prods)
      setCategorias(cats)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargandoLista(false)
    }
  }

  useEffect(() => { cargar() }, [searchQuery])

  function abrirNuevo() {
    setEditando(null)
    setForm(VACIO)
    setErrores({})
    setImagenSeleccionada(null)
    setModalAbierto(true)
  }

  function abrirEditar(p) {
    setEditando(p)
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: p.precio,
      stock: p.stock,
      categoria: p.categoria
    })
    setErrores({})
    setImagenSeleccionada(null)
    setModalAbierto(true)
  }

  function actualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor })
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }

  async function guardar(e) {
    e.preventDefault()
    const erroresLocales = validarProducto(form)
    if (Object.keys(erroresLocales).length > 0) {
      setErrores(erroresLocales)
      return
    }
    if (guardando) return
    setGuardando(true)
    try {
      const body = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio: parseFloat(form.precio),
        stock: parseInt(form.stock, 10),
        categoria: parseInt(form.categoria, 10)
      }

      let productoGuardado
      if (editando) {
        productoGuardado = await api(`/api/productos/${editando.id}/`, { method: 'PUT', body })
      } else {
        productoGuardado = await api('/api/productos/', { method: 'POST', body })
      }

      if (imagenSeleccionada) {
        const fd = new FormData()
        fd.append('producto', productoGuardado.id)
        fd.append('imagen', imagenSeleccionada)
        fd.append('es_principal', true)
        await api('/api/imagenes-producto/', { method: 'POST', body: fd, isFormData: true })
      }

      showToast(`"${form.nombre}" se ${editando ? 'actualizó' : 'creó'} correctamente.`, 'success')
      setModalAbierto(false)
      cargar()
    } catch (err) {
      const erroresApi = erroresDeApi(err.data)
      if (Object.keys(erroresApi).length > 0) {
        setErrores(erroresApi)
      } else {
        showToast(err.message, 'error')
      }
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarEliminar() {
    if (!confirmando) return
    setEliminando(true)
    try {
      await api(`/api/productos/${confirmando.id}/`, { method: 'DELETE' })
      showToast(`"${confirmando.nombre}" se eliminó.`, 'success')
      setConfirmando(null)
      cargar()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setEliminando(false)
    }
  }

  function nombreCategoria(id) {
    const cat = categorias.find((c) => c.id === id)
    return cat ? cat.nombre : '—'
  }

  function urlImagen(producto) {
    const principal = producto.imagenes?.find((i) => i.es_principal) || producto.imagenes?.[0]
    if (!principal) return null
    return principal.imagen.startsWith('http') ? principal.imagen : `${getBaseUrl()}${principal.imagen}`
  }

  function badgeStock(stock) {
    if (stock <= 0) return <span className="pill pill-fail">Agotado</span>
    if (stock <= 5) return <span className="pill pill-warn">Stock bajo ({stock})</span>
    return <span className="pill pill-ok">En stock ({stock})</span>
  }

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>Productos</h1>
          <p>Catálogo completo de la tienda</p>
        </div>
        <button className="btn btn-primario" onClick={abrirNuevo}>+ Nuevo producto</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tarjeta">
        <table>
          <thead>
            <tr>
              <th></th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargandoLista ? (
              <SkeletonFilas filas={5} columnas={6} />
            ) : productos.length === 0 ? (
              <tr><td colSpan="6"><div className="vacio">Aún no hay productos. Crea el primero.</div></td></tr>
            ) : (
              productos.map((p) => {
                const img = urlImagen(p)
                return (
                  <tr key={p.id}>
                    <td>
                      {img
                        ? <img src={img} className="miniatura" alt={p.nombre} />
                        : <div className="miniatura" />}
                    </td>
                    <td>{p.nombre}</td>
                    <td>{nombreCategoria(p.categoria)}</td>
                    <td>${parseFloat(p.precio).toFixed(2)}</td>
                    <td>{badgeStock(p.stock)}</td>
                    <td>
                      <div className="acciones-fila">
                        <button className="btn btn-secundario btn-chico" onClick={() => abrirEditar(p)}>Editar</button>
                        <button className="btn btn-peligro btn-chico" onClick={() => setConfirmando(p)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal abierto={modalAbierto} onClose={() => setModalAbierto(false)} titulo={editando ? 'Editar producto' : 'Nuevo producto'} ancho="460px">
        <form onSubmit={guardar}>
          <label>Nombre</label>
          <input className={errores.nombre ? 'input-error' : ''} value={form.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)} />
          {errores.nombre && <span className="campo-error">{errores.nombre}</span>}

          <label>Descripción</label>
          <textarea rows="3" value={form.descripcion} onChange={(e) => actualizarCampo('descripcion', e.target.value)} />

          <div className="fila-form">
            <div>
              <label>Precio</label>
              <input className={errores.precio ? 'input-error' : ''} type="number" step="0.01" value={form.precio} onChange={(e) => actualizarCampo('precio', e.target.value)} />
              {errores.precio && <span className="campo-error">{errores.precio}</span>}
            </div>
            <div>
              <label>Stock</label>
              <input className={errores.stock ? 'input-error' : ''} type="number" value={form.stock} onChange={(e) => actualizarCampo('stock', e.target.value)} />
              {errores.stock && <span className="campo-error">{errores.stock}</span>}
            </div>
          </div>

          <label>Categoría</label>
          <select className={errores.categoria ? 'input-error' : ''} value={form.categoria} onChange={(e) => actualizarCampo('categoria', e.target.value)}>
            <option value="">Selecciona una categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          {errores.categoria && <span className="campo-error">{errores.categoria}</span>}

          <label>Imagen {editando ? '(opcional, reemplaza la principal)' : ''}</label>
          <input type="file" accept="image/*" onChange={(e) => setImagenSeleccionada(e.target.files[0])} />
          {imagenSeleccionada && <span className="campo-ayuda">Seleccionada: {imagenSeleccionada.name}</span>}

          <div className="modal-acciones">
            <button type="button" className="btn btn-secundario" onClick={() => setModalAbierto(false)} disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn btn-primario" disabled={guardando}>
              {guardando ? <Spinner size={14} /> : null}
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        abierto={!!confirmando}
        onClose={() => setConfirmando(null)}
        onConfirm={confirmarEliminar}
        cargando={eliminando}
        titulo="Eliminar producto"
        mensaje={confirmando ? `¿Eliminar "${confirmando.nombre}"? Esta acción no se puede deshacer.` : ''}
      />
    </div>
  )
}
