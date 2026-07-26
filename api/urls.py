from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    registro, mi_perfil, cambiar_password,
    UsuarioAdminViewSet, CategoriaViewSet, ProductoViewSet, ImagenProductoViewSet,
    DireccionViewSet, PedidoViewSet, ResenaViewSet, PreguntaProductoViewSet,
    ver_carrito, agregar_al_carrito, actualizar_carrito,
    eliminar_del_carrito, vaciar_carrito, confirmar_carrito,
    busqueda_inteligente, pago_exitoso, pago_cancelado
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioAdminViewSet, basename='usuario')
router.register(r'categorias', CategoriaViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'imagenes-producto', ImagenProductoViewSet, basename='imagen-producto')
router.register(r'direcciones', DireccionViewSet, basename='direccion')
router.register(r'pedidos', PedidoViewSet, basename='pedido')
router.register(r'resenas', ResenaViewSet)
router.register(r'preguntas', PreguntaProductoViewSet, basename='pregunta')

urlpatterns = [
    path('registro/', registro),
    path('mi-perfil/', mi_perfil),
    path('mi-perfil/cambiar-password/', cambiar_password),

    path('carrito/', ver_carrito),
    path('carrito/agregar/', agregar_al_carrito),
    path('carrito/actualizar/<int:producto_id>/', actualizar_carrito),
    path('carrito/eliminar/<int:producto_id>/', eliminar_del_carrito),
    path('carrito/vaciar/', vaciar_carrito),
    path('carrito/confirmar/', confirmar_carrito),

    # Búsqueda inteligente con IA (pública, para el cliente)
    path('ia/', busqueda_inteligente),

    # Páginas a las que Stripe redirige el navegador tras el pago (públicas)
    path('stripe/pago-exitoso/', pago_exitoso),
    path('stripe/pago-cancelado/', pago_cancelado),
] + router.urls
