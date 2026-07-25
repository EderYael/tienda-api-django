import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api, getBaseUrl } from '../api.js'
import { useToast } from '../context/ToastContext.jsx'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Spinner from '../components/Spinner.jsx'
import { SkeletonFilas } from '../components/Skeleton.jsx'
import { IconFilterX, IconTrash, IconStar } from '../components/icons.jsx'
import { validarProducto, erroresDeApi } from '../utils/validacion.js'

const VACIO = { nombre: '', descripcion: '', precio: '', stock: '', categoria: '' }

export default function Productos() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const searchQuery = searchParams.get('search') || ''
  const soloStockBajo = searchParams.get('stockBajo') === 'true'
  const { showToast } = useToast()

  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [imagenesExistentes, setImagenesExistentes] = useState([])
  const [imagenesNuevas, setImagenesNuevas] = useState([]) // File[]
  const [subiendoImagen, setSubiendoImagen] = useState(false)
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
    setImagenesExistentes([])
    setImagenesNuevas([])
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
    setImagenesExistentes(p.imagenes || [])
    setImagenesNuevas([])
    setModalAbierto(true)
  }

  function actualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor })
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }

  function agregarImagenesNuevas(archivos) {
    setImagenesNuevas([...imagenesNuevas, ...Array.from(archivos)])
  }

  function quitarImagenNueva(indice) {
    setImagenesNuevas(imagenesNuevas.filter((_, i) => i !== indice))
  }

  async function eliminarImagenExistente(imagen) {
    try {
      await api(`/api/imagenes-producto/${imagen.id}/`, { method: 'DELETE' })
      setImagenesExistentes(imagenesExistentes.filter((i) => i.id !== imagen.id))
      showToast('Imagen eliminada.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function marcarImagenPrincipal(imagen) {
    try {
      await api(`/api/imagenes-producto/${imagen.id}/marcar-principal/`, { method: 'POST' })
      setImagenesExistentes(imagenesExistentes.map((i) => ({ ...i, es_principal: i.id === imagen.id })))
      showToast('Imagen principal actualizada.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
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

      if (imagenesNuevas.length > 0) {
        setSubiendoImagen(true)
        const sinImagenesPrevias = imagenesExistentes.length === 0
        for (let i = 0; i < imagenesNuevas.length; i++) {
          const fd = new FormData()
          fd.append('producto', productoGuardado.id)
          fd.append('imagen', imagenesNuevas[i])
          // La primera imagen que se sube a un producto sin fotos todavía
          // se marca como principal automáticamente; el resto, no (el admin
          // puede cambiarla después con "Marcar como principal").
          fd.append('es_principal', sinImagenesPrevias && i === 0)
          await api('/api/imagenes-producto/', { method: 'POST', body: fd, isFormData: true })
        }
        setSubiendoImagen(false)
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
      setSubiendoImagen(false)
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

  function resolverUrlImagen(url) {
    if (!url) return null
    return url.startsWith('http') ? url : `${getBaseUrl()}${url}`
  }

  function urlImagenPrincipal(producto) {
    const principal = producto.imagenes?.find((i) => i.es_principal) || producto.imagenes?.[0]
    return principal ? resolverUrlImagen(principal.imagen) : null
  }

  function badgeStock(stock) {
    if (stock <= 0) return <span className="pill pill-fail">Agotado</span>
    if (stock <= 5) return <span className="pill pill-warn">Stock bajo ({stock})</span>
    return <span className="pill pill-ok">En stock ({stock})</span>
  }

  const productosMostrados = soloStockBajo ? productos.filter((p) => p.stock <= 5) : productos

  function quitarFiltroStockBajo() {
    navigate('/productos', { replace: true })
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

      {soloStockBajo && (
        <div className="chip-filtro-activo">
          Mostrando solo productos con stock bajo (≤5)
          <button type="button" onClick={quitarFiltroStockBajo}>
            <IconFilterX size={13} /> Quitar filtro
          </button>
        </div>
      )}

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
            ) : productosMostrados.length === 0 ? (
              <tr><td colSpan="6"><div className="vacio">{soloStockBajo ? 'Ningún producto tiene stock bajo ahora mismo.' : 'Aún no hay productos. Crea el primero.'}</div></td></tr>
            ) : (
              productosMostrados.map((p) => {
                const img = urlImagenPrincipal(p)
                const totalImagenes = p.imagenes?.length || 0
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ position: 'relative', width: 'fit-content' }}>
                        {img
                          ? <img src={img} className="miniatura" alt={p.nombre} />
                          : <div className="miniatura" />}
                        {totalImagenes > 1 && (
                          <span className="badge-contador-imagenes">{totalImagenes}</span>
                        )}
                      </div>
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

      <Modal abierto={modalAbierto} onClose={() => setModalAbierto(false)} titulo={editando ? 'Editar producto' : 'Nuevo producto'} ancho="520px">
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

          <label>Imágenes (puedes seleccionar varias a la vez, como en un marketplace)</label>

          {imagenesExistentes.length > 0 && (
            <div className="galeria-imagenes">
              {imagenesExistentes.map((img) => (
                <div key={img.id} className="galeria-item">
                  <img src={resolverUrlImagen(img.imagen)} alt="" />
                  {img.es_principal && <span className="galeria-badge-principal">Principal</span>}
                  <div className="galeria-acciones">
                    {!img.es_principal && (
                      <button type="button" title="Marcar como principal" onClick={() => marcarImagenPrincipal(img)}>
                        <IconStar size={13} />
                      </button>
                    )}
                    <button type="button" title="Eliminar" onClick={() => eliminarImagenExistente(img)}>
                      <IconTrash size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {imagenesNuevas.length > 0 && (
            <div className="galeria-imagenes">
              {imagenesNuevas.map((archivo, i) => (
                <div key={i} className="galeria-item galeria-item-pendiente">
                  <img src={URL.createObjectURL(archivo)} alt="" />
                  <span className="galeria-badge-pendiente">Nueva</span>
                  <div className="galeria-acciones">
                    <button type="button" title="Quitar" onClick={() => quitarImagenNueva(i)}>
                      <IconTrash size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <input type="file" accept="image/*" multiple onChange={(e) => agregarImagenesNuevas(e.target.files)} />
          <span className="campo-ayuda">
            {imagenesExistentes.length === 0 && imagenesNuevas.length === 0
              ? 'La primera imagen que subas será la principal.'
              : 'Las imágenes nuevas se agregan a la galería; usa la estrella para elegir cuál es la principal.'}
          </span>

          <div className="modal-acciones">
            <button type="button" className="btn btn-secundario" onClick={() => setModalAbierto(false)} disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn btn-primario" disabled={guardando}>
              {guardando ? <Spinner size={14} /> : null}
              {guardando ? (subiendoImagen ? 'Subiendo imágenes...' : 'Guardando...') : 'Guardar'}
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
