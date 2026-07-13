from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Perfil, Categoria, Producto, Pedido, DetallePedido, Resena


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
    rol = serializers.CharField(source='perfil.rol', read_only=True)
    password = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'rol', 'password']


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = '__all__'


class DetallePedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetallePedido
        fields = ['id', 'producto', 'cantidad', 'subtotal']


class PedidoSerializer(serializers.ModelSerializer):
    detalles = DetallePedidoSerializer(many=True)
    usuario = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = Pedido
        fields = ['id', 'usuario', 'fecha', 'estado', 'total', 'detalles']

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
