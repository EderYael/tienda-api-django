from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    registro, mi_perfil,
    UsuarioAdminViewSet, CategoriaViewSet, ProductoViewSet, ImagenProductoViewSet,
    DireccionViewSet, PedidoViewSet, ResenaViewSet,
    ver_carrito, agregar_al_carrito, actualizar_carrito,
    eliminar_del_carrito, vaciar_carrito, confirmar_carrito
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioAdminViewSet, basename='usuario')
router.register(r'categorias', CategoriaViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'imagenes-producto', ImagenProductoViewSet, basename='imagen-producto')
router.register(r'direcciones', DireccionViewSet, basename='direccion')
router.register(r'pedidos', PedidoViewSet, basename='pedido')
router.register(r'resenas', ResenaViewSet)

urlpatterns = [
    path('registro/', registro),
    path('mi-perfil/', mi_perfil),

    path('carrito/', ver_carrito),
    path('carrito/agregar/', agregar_al_carrito),
    path('carrito/actualizar/<int:producto_id>/', actualizar_carrito),
    path('carrito/eliminar/<int:producto_id>/', eliminar_del_carrito),
    path('carrito/vaciar/', vaciar_carrito),
    path('carrito/confirmar/', confirmar_carrito),
] + router.urls
