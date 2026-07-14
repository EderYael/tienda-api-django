import React, { useEffect, useState } from 'react'
import { api, getBaseUrl } from '../api.js'

const VACIO = { nombre: '', descripcion: '', precio: '', stock: '', categoria: '' }

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null)

  async function cargar() {
    try {
      const [prods, cats] = await Promise.all([
        api('/api/productos/'),
        api('/api/categorias/')
      ])
      setProductos(prods)
      setCategorias(cats)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { cargar() }, [])

  function abrirNuevo() {
    setEditando(null)
    setForm(VACIO)
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
    setImagenSeleccionada(null)
    setModalAbierto(true)
  }

  async function guardar(e) {
    e.preventDefault()
    try {
      const body = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio: parseFloat(form.precio),
        stock: parseInt(form.stock),
        categoria: parseInt(form.categoria)
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

      setModalAbierto(false)
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function eliminar(p) {
    if (!confirm(`¿Eliminar el producto "${p.nombre}"?`)) return
    try {
      await api(`/api/productos/${p.id}/`, { method: 'DELETE' })
      cargar()
    } catch (err) {
      setError(err.message)
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
        {productos.length === 0 ? (
          <div className="vacio">Aún no hay productos. Crea el primero.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th></th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
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
                    <td className={p.stock <= 5 ? 'badge-stock-bajo' : ''}>{p.stock}</td>
                    <td>
                      <div className="acciones-fila">
                        <button className="btn btn-secundario btn-chico" onClick={() => abrirEditar(p)}>Editar</button>
                        <button className="btn btn-peligro btn-chico" onClick={() => eliminar(p)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalAbierto && (
        <div className="overlay" onClick={() => setModalAbierto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editando ? 'Editar producto' : 'Nuevo producto'}</h2>
            <form onSubmit={guardar}>
              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />

              <label>Descripción</label>
              <textarea rows="3" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />

              <div className="fila-form">
                <div>
                  <label>Precio</label>
                  <input type="number" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
                </div>
                <div>
                  <label>Stock</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
                </div>
              </div>

              <label>Categoría</label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required>
                <option value="">Selecciona una categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>

              <label>Imagen {editando ? '(opcional, reemplaza la principal)' : ''}</label>
              <input type="file" accept="image/*" onChange={(e) => setImagenSeleccionada(e.target.files[0])} />

              <div className="modal-acciones">
                <button type="button" className="btn btn-secundario" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primario">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
