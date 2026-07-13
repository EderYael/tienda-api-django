from django.contrib import admin
from .models import (
    Perfil, Categoria, Producto, ImagenProducto, Direccion,
    Pedido, DetallePedido, Resena
)

admin.site.register(Perfil)
admin.site.register(Categoria)
admin.site.register(Producto)
admin.site.register(ImagenProducto)
admin.site.register(Direccion)
admin.site.register(Pedido)
admin.site.register(DetallePedido)
admin.site.register(Resena)
