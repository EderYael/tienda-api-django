from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.core.cache import cache

from .models import Categoria, Producto, Pedido, DetallePedido, Resena
from .serializers import (
    RegistroSerializer, PerfilSerializer, UsuarioAdminSerializer,
    CategoriaSerializer, ProductoSerializer, PedidoSerializer, ResenaSerializer
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


# ---------- Gestión de usuarios (solo administrador) ----------

class UsuarioAdminViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UsuarioAdminSerializer
    permission_classes = [EsSoloAdministrador]


# ---------- Categorías (invitados/registrados leen, solo admin escribe) ----------

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [EsAdministradorOSoloLectura]


# ---------- Productos (invitados/registrados leen, solo admin escribe) ----------

class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [EsAdministradorOSoloLectura]


# ---------- Pedidos (usuario ve/gestiona los suyos, admin ve todo) ----------

class PedidoViewSet(viewsets.ModelViewSet):
    serializer_class = PedidoSerializer
    permission_classes = [EsPropietarioOAdministrador]

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

    carrito = _obtener_carrito(request.user.id)

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

    pedido = Pedido.objects.create(usuario=request.user, estado='pendiente')
    total = 0

    for item in carrito:
        subtotal = float(item['precio']) * item['cantidad']
        DetallePedido.objects.create(
            pedido=pedido,
            producto_id=item['producto_id'],
            cantidad=item['cantidad'],
            subtotal=subtotal
        )
        total += subtotal

    pedido.total = total
    pedido.save()

    _guardar_carrito(request.user.id, [])

    return Response(
        {'mensaje': 'Pedido creado desde el carrito', 'pedido_id': pedido.id},
        status=status.HTTP_201_CREATED
    )
