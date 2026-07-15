from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import transaction
from django.db.models import Sum, Count
from rest_framework import filters
from datetime import datetime, timedelta
import re

from .models import Categoria, Producto, ImagenProducto, Direccion, Pedido, DetallePedido, Resena
from .serializers import (
    RegistroSerializer, PerfilSerializer, UsuarioAdminSerializer,
    CategoriaSerializer, ImagenProductoSerializer, ProductoSerializer,
    DireccionSerializer, PedidoSerializer, ResenaSerializer
)
from .permissions import (
    EsAdministradorOSoloLectura, EsPropietarioOAdministrador,
    EsClienteRegistrado, EsSoloAdministrador, EsAutorDeResenaOAdministrador
)


# ---------- Registro y perfil ----------

@api_view(['POST'])
def registro(request):
    serializer = RegistroSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'mensaje': 'Usuario creado correctamente'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mi_perfil(request):
    serializer = PerfilSerializer(request.user.perfil)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ---------- Gestión de usuarios (solo administrador, CRUD completo) ----------

class UsuarioAdminViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('perfil').all()
    serializer_class = UsuarioAdminSerializer
    permission_classes = [EsSoloAdministrador]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email']

    def perform_update(self, serializer):
        intenta_autosuspenderse = (
            serializer.instance == self.request.user
            and serializer.validated_data.get('is_active') is False
        )
        if intenta_autosuspenderse:
            raise ValidationError('No puedes suspender tu propia cuenta.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise ValidationError(
                'No puedes eliminar tu propia cuenta de administrador.'
            )
        instance.delete()

# ---------- Direcciones de envío (cada usuario ve/gestiona las suyas, admin ve todas) ----------

class DireccionViewSet(viewsets.ModelViewSet):
    serializer_class = DireccionSerializer
    permission_classes = [EsPropietarioOAdministrador]

    def get_queryset(self):
        usuario = self.request.user
        if hasattr(usuario, 'perfil') and usuario.perfil.rol == 'administrador':
            return Direccion.objects.all()
        return Direccion.objects.filter(usuario=usuario)

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


# ---------- Categorías (invitados/registrados leen, solo admin escribe) ----------

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [EsAdministradorOSoloLectura]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']


# ---------- Productos (invitados/registrados leen, solo admin escribe) ----------

class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.prefetch_related('imagenes').all()
    serializer_class = ProductoSerializer
    permission_classes = [EsAdministradorOSoloLectura]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'descripcion']

# ---------- Imágenes de producto (invitados/registrados leen, solo admin escribe) ----------

class ImagenProductoViewSet(viewsets.ModelViewSet):
    serializer_class = ImagenProductoSerializer
    permission_classes = [EsAdministradorOSoloLectura]

    def get_queryset(self):
        queryset = ImagenProducto.objects.all()
        producto_id = self.request.query_params.get('producto')
        if producto_id:
            queryset = queryset.filter(producto_id=producto_id)
        return queryset


# ---------- Pedidos (usuario ve/gestiona los suyos, admin ve todo) ----------

class PedidoViewSet(viewsets.ModelViewSet):
    serializer_class = PedidoSerializer
    permission_classes = [EsPropietarioOAdministrador]
    filter_backends = [filters.SearchFilter]
    search_fields = ['id', 'estado', 'usuario__username']

    def get_queryset(self):
        usuario = self.request.user
        if hasattr(usuario, 'perfil') and usuario.perfil.rol == 'administrador':
            return Pedido.objects.all()
        return Pedido.objects.filter(usuario=usuario)

    def get_serializer_context(self):
        return {'request': self.request}


# ---------- Reseñas (todos leen, registrado crea, autor/admin edita o borra) ----------

class ResenaViewSet(viewsets.ModelViewSet):
    queryset = Resena.objects.all()
    serializer_class = ResenaSerializer
    permission_classes = [EsAutorDeResenaOAdministrador]
    filter_backends = [filters.SearchFilter]
    search_fields = ['comentario', 'usuario__username', 'producto__nombre']

    def get_serializer_context(self):
        return {'request': self.request}


# ---------- Carrito (en memoria, exclusivo de clientes registrados) ----------

def _obtener_carrito(usuario_id):
    return cache.get(f'carrito_{usuario_id}', [])


def _guardar_carrito(usuario_id, carrito):
    cache.set(f'carrito_{usuario_id}', carrito, timeout=None)


@api_view(['GET'])
@permission_classes([EsClienteRegistrado])
def ver_carrito(request):
    carrito = _obtener_carrito(request.user.id)
    return Response(carrito, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([EsClienteRegistrado])
def agregar_al_carrito(request):
    producto_id = request.data.get('producto_id')
    cantidad = int(request.data.get('cantidad', 1))

    producto = Producto.objects.filter(id=producto_id).first()
    if not producto:
        return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    # Se normaliza a int: si llega como string (form-data) o int (JSON),
    # el carrito siempre guarda el mismo tipo para poder compararlo después.
    producto_id = producto.id

    carrito = _obtener_carrito(request.user.id)

    cantidad_actual_en_carrito = next(
        (item['cantidad'] for item in carrito if item['producto_id'] == producto_id), 0
    )
    if producto.stock < cantidad_actual_en_carrito + cantidad:
        return Response(
            {'error': f'Solo hay {producto.stock} unidades disponibles de "{producto.nombre}".'},
            status=status.HTTP_400_BAD_REQUEST
        )

    for item in carrito:
        if item['producto_id'] == producto_id:
            item['cantidad'] += cantidad
            break
    else:
        carrito.append({
            'producto_id': producto_id,
            'nombre': producto.nombre,
            'precio': str(producto.precio),
            'cantidad': cantidad
        })

    _guardar_carrito(request.user.id, carrito)
    return Response(carrito, status=status.HTTP_201_CREATED)


@api_view(['PUT'])
@permission_classes([EsClienteRegistrado])
def actualizar_carrito(request, producto_id):
    nueva_cantidad = int(request.data.get('cantidad', 1))
    carrito = _obtener_carrito(request.user.id)

    for item in carrito:
        if item['producto_id'] == producto_id:
            item['cantidad'] = nueva_cantidad
            _guardar_carrito(request.user.id, carrito)
            return Response(carrito, status=status.HTTP_200_OK)

    return Response({'error': 'Ese producto no está en tu carrito'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@permission_classes([EsClienteRegistrado])
def eliminar_del_carrito(request, producto_id):
    carrito = _obtener_carrito(request.user.id)
    carrito = [item for item in carrito if item['producto_id'] != producto_id]
    _guardar_carrito(request.user.id, carrito)
    return Response(carrito, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([EsClienteRegistrado])
def vaciar_carrito(request):
    _guardar_carrito(request.user.id, [])
    return Response({'mensaje': 'Carrito vaciado'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([EsClienteRegistrado])
def confirmar_carrito(request):
    carrito = _obtener_carrito(request.user.id)
    if not carrito:
        return Response({'error': 'El carrito está vacío'}, status=status.HTTP_400_BAD_REQUEST)

    direccion_id = request.data.get('direccion_id')
    direccion = None
    if direccion_id:
        direccion = Direccion.objects.filter(id=direccion_id, usuario=request.user).first()
        if not direccion:
            return Response(
                {'error': 'La dirección indicada no existe o no te pertenece.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    with transaction.atomic():
        # Se bloquean las filas de producto para evitar condiciones de carrera
        # (dos usuarios comprando la última pieza al mismo tiempo).
        productos_ids = [int(item['producto_id']) for item in carrito]
        productos = {
            p.id: p for p in Producto.objects.select_for_update().filter(id__in=productos_ids)
        }

        errores = []
        for item in carrito:
            producto = productos.get(int(item['producto_id']))
            if not producto:
                errores.append(f"El producto con id {item['producto_id']} ya no existe.")
            elif producto.stock < item['cantidad']:
                errores.append(
                    f'Solo hay {producto.stock} unidades disponibles de "{producto.nombre}".'
                )

        if errores:
            return Response({'error': errores}, status=status.HTTP_400_BAD_REQUEST)

        pedido = Pedido.objects.create(usuario=request.user, direccion=direccion, estado='pendiente')
        total = 0

        for item in carrito:
            producto = productos[int(item['producto_id'])]
            subtotal = float(item['precio']) * item['cantidad']

            DetallePedido.objects.create(
                pedido=pedido,
                producto=producto,
                cantidad=item['cantidad'],
                subtotal=subtotal
            )
            producto.stock -= item['cantidad']
            producto.save()

            total += subtotal

        pedido.total = total
        pedido.save()

    _guardar_carrito(request.user.id, [])

    return Response(
        {'mensaje': 'Pedido creado desde el carrito', 'pedido_id': pedido.id},
        status=status.HTTP_201_CREATED
    )


# ---------- Endpoint de IA ----------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ia_endpoint(request):
    """
    Endpoint de IA que recibe una pregunta en lenguaje natural y devuelve datos de la BD.
    Ejemplos de preguntas:
      - "lista productos"
      - "cuántos usuarios hay"
      - "ventas totales"
      - "pedidos recientes"
      - "stock bajo"
      - "productos de electrónica"
    """
    pregunta = request.data.get('pregunta', '').strip().lower()
    if not pregunta:
        return Response({'error': 'La pregunta no puede estar vacía'}, status=400)

    respuesta = {
        "pregunta": pregunta,
        "datos": None,
        "tipo": "desconocido",
        "error": None
    }

    # 1. Contar usuarios
    if re.search(r'\b(cuántos|numero|total|cantidad)\s+usuarios?\b', pregunta):
        total = User.objects.count()
        respuesta['datos'] = {'total_usuarios': total}
        respuesta['tipo'] = 'contar'

    # 2. Listar productos
    elif 'productos' in pregunta and re.search(r'\b(lista|muestra|todos|ver)\b', pregunta):
        productos = Producto.objects.all().values('id', 'nombre', 'precio', 'stock', 'categoria__nombre')
        respuesta['datos'] = list(productos)
        respuesta['tipo'] = 'listar'

    # 3. Productos con stock bajo (menor a 10)
    elif re.search(r'\b(stock\s+bajo|poco\s+stock|stock\s+menor|bajo\s+stock)\b', pregunta):
        productos = Producto.objects.filter(stock__lt=10).values('id', 'nombre', 'stock')
        respuesta['datos'] = list(productos)
        respuesta['tipo'] = 'listar'

    # 4. Ventas totales (suma de total de pedidos)
    elif re.search(r'\b(ventas\s+totales|ingresos\s+totales|total\s+ventas|ganancias)\b', pregunta):
        total = Pedido.objects.aggregate(total_ventas=Sum('total'))['total_ventas'] or 0
        respuesta['datos'] = {'total_ventas': float(total)}
        respuesta['tipo'] = 'contar'

    # 5. Pedidos recientes (últimos 7 días)
    elif re.search(r'\b(pedidos\s+recientes|ultimos\s+pedidos|pedidos\s+nuevos)\b', pregunta):
        fecha_limite = datetime.now() - timedelta(days=7)
        pedidos = Pedido.objects.filter(fecha_creacion__gte=fecha_limite).order_by('-fecha_creacion')[:10].values(
            'id', 'total', 'estado', 'fecha_creacion', 'usuario__email'
        )
        respuesta['datos'] = list(pedidos)
        respuesta['tipo'] = 'listar'

    # 6. Listar categorías
    elif re.search(r'\b(categorías|categorias)\b', pregunta):
        categorias = Categoria.objects.all().values('id', 'nombre')
        respuesta['datos'] = list(categorias)
        respuesta['tipo'] = 'listar'

    # 7. Productos por categoría (ej. "productos de electrónica")
    elif re.search(r'productos\s+de\s+(\w+)', pregunta):
        match = re.search(r'productos\s+de\s+(\w+)', pregunta)
        if match:
            categoria_nombre = match.group(1)
            productos = Producto.objects.filter(categoria__nombre__icontains=categoria_nombre).values('id', 'nombre', 'precio', 'stock')
            respuesta['datos'] = list(productos)
            respuesta['tipo'] = 'listar'
        else:
            respuesta['error'] = 'No se pudo identificar la categoría'

    # 8. Si contiene "producto" (fallback)
    elif 'producto' in pregunta:
        productos = Producto.objects.all().values('id', 'nombre', 'precio', 'stock')[:20]
        respuesta['datos'] = list(productos)
        respuesta['tipo'] = 'listar'

    # 9. Si contiene "usuario" (fallback) - se incluye el rol desde el perfil
    elif 'usuario' in pregunta:
        usuarios = User.objects.select_related('perfil').all().values(
            'id', 'email', 'is_active', 'perfil__rol'
        )[:20]
        # Renombrar campo para claridad
        usuarios = [{'id': u['id'], 'email': u['email'], 'is_active': u['is_active'], 'rol': u['perfil__rol']} for u in usuarios]
        respuesta['datos'] = usuarios
        respuesta['tipo'] = 'listar'

    else:
        respuesta['error'] = (
            'No entendí tu pregunta. Prueba con: "lista productos", "cuántos usuarios", '
            '"ventas totales", "pedidos recientes", "stock bajo", etc.'
        )

    # Si no hubo datos y no hay error, se asigna mensaje
    if respuesta['datos'] is None and respuesta['error'] is None:
        respuesta['datos'] = {'mensaje': 'No se encontraron resultados para tu consulta'}

    return Response(respuesta)
