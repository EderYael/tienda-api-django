from rest_framework import permissions


class EsAdministradorOSoloLectura(permissions.BasePermission):
    """
    Cualquiera (invitado, registrado, administrador) puede LEER (GET).
    Solo el ADMINISTRADOR puede escribir (POST, PUT, PATCH, DELETE).
    """
    message = 'Solo un administrador puede crear, editar o eliminar. Como invitado o usuario registrado, solo puedes consultar.'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'perfil') and request.user.perfil.rol == 'administrador'


class EsPropietarioOAdministrador(permissions.BasePermission):
    """
    Solo usuarios autenticados pueden acceder a los pedidos.
    Un usuario registrado solo ve/edita sus propios pedidos.
    Un administrador ve/edita todos los pedidos.
    """
    message = 'Debes iniciar sesión para ver o gestionar pedidos.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'perfil') and request.user.perfil.rol == 'administrador':
            return True
        return obj.usuario == request.user


class EsClienteRegistrado(permissions.BasePermission):
    """
    Solo usuarios con rol 'registrado' pueden usar el carrito.
    Invitados (no autenticados) y administradores NO tienen acceso.
    """
    message = 'El carrito de compras es exclusivo para usuarios registrados. Los administradores no pueden comprar, y los invitados deben registrarse primero.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'perfil') and request.user.perfil.rol == 'registrado'


class EsSoloAdministrador(permissions.BasePermission):
    """
    Nadie más que el administrador puede acceder, ni siquiera para leer (GET).
    Invitados y usuarios registrados quedan completamente bloqueados.
    """
    message = 'Esta información es exclusiva del administrador. No tienes permiso para consultarla.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'perfil') and request.user.perfil.rol == 'administrador'


class EsAutorDeResenaOAdministrador(permissions.BasePermission):
    """
    Cualquiera puede LEER reseñas (invitado incluido).
    Solo usuarios registrados pueden CREAR reseñas.
    Para EDITAR/BORRAR: solo el autor de la reseña o un administrador.
    """
    message = 'Solo el autor de la reseña o un administrador puede editarla o eliminarla.'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'perfil') and request.user.perfil.rol == 'registrado'

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if hasattr(request.user, 'perfil') and request.user.perfil.rol == 'administrador':
            return True
        return obj.usuario == request.user
