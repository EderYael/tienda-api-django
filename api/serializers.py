from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Perfil, Categoria, Producto, ImagenProducto, Direccion,
    Pedido, DetallePedido, Resena
)


class RegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        usuario = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        Perfil.objects.create(usuario=usuario, rol='registrado')
        return usuario


class PerfilSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='usuario.username', read_only=True)
    email = serializers.CharField(source='usuario.email', read_only=True)

    class Meta:
        model = Perfil
        fields = ['username', 'email', 'rol']


class UsuarioAdminSerializer(serializers.ModelSerializer):
    """
    Serializer para que el administrador gestione usuarios (crear, editar, eliminar).
    - 'password' es write_only: nunca se devuelve en las respuestas.
    - 'rol' vive en el modelo Perfil (OneToOne), por eso se maneja con source='perfil.rol'
      y se procesa manualmente en create()/update().
    """
    rol = serializers.ChoiceField(choices=Perfil.ROLES, source='perfil.rol', required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'rol', 'password']

    def create(self, validated_data):
        perfil_data = validated_data.pop('perfil', {})
        password = validated_data.pop('password', None)
        rol = perfil_data.get('rol', 'registrado')

        usuario = User(**validated_data)
        if password:
            usuario.set_password(password)
        else:
            usuario.set_unusable_password()
        usuario.save()

        Perfil.objects.create(usuario=usuario, rol=rol)
        return usuario

    def update(self, instance, validated_data):
        perfil_data = validated_data.pop('perfil', None)
        password = validated_data.pop('password', None)

        for atributo, valor in validated_data.items():
            setattr(instance, atributo, valor)
        if password:
            instance.set_password(password)
        instance.save()

        if perfil_data and 'rol' in perfil_data:
            instance.perfil.rol = perfil_data['rol']
            instance.perfil.save()

        return instance


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class ImagenProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenProducto
        fields = ['id', 'producto', 'imagen', 'es_principal', 'orden']


class ProductoSerializer(serializers.ModelSerializer):
    imagenes = ImagenProductoSerializer(many=True, read_only=True)

    class Meta:
        model = Producto
        fields = ['id', 'nombre', 'descripcion', 'precio', 'stock', 'categoria', 'fecha_creacion', 'imagenes']


class DireccionSerializer(serializers.ModelSerializer):
    usuario = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = Direccion
        fields = [
            'id', 'usuario', 'alias', 'calle', 'numero', 'colonia',
            'ciudad', 'estado', 'codigo_postal', 'telefono_contacto',
            'referencias', 'es_principal'
        ]


class DetallePedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetallePedido
        fields = ['id', 'producto', 'cantidad', 'subtotal']


class PedidoSerializer(serializers.ModelSerializer):
    detalles = DetallePedidoSerializer(many=True)
    usuario = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = Pedido
        fields = ['id', 'usuario', 'direccion', 'fecha', 'estado', 'total', 'detalles']

    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        usuario = self.context['request'].user
        pedido = Pedido.objects.create(usuario=usuario, **validated_data)
        total = 0
        for detalle in detalles_data:
            DetallePedido.objects.create(pedido=pedido, **detalle)
            total += detalle['subtotal']
        pedido.total = total
        pedido.save()
        return pedido


class ResenaSerializer(serializers.ModelSerializer):
    usuario = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = Resena
        fields = ['id', 'usuario', 'producto', 'calificacion', 'comentario', 'fecha']

    def create(self, validated_data):
        usuario = self.context['request'].user
        return Resena.objects.create(usuario=usuario, **validated_data)
