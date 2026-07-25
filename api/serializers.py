from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Perfil, Categoria, Producto, ImagenProducto, Direccion,
    Pedido, DetallePedido, Resena, PreguntaProducto
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
        Perfil.objects.update_or_create(usuario=usuario, defaults={'rol': 'registrado'})
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

        Perfil.objects.update_or_create(usuario=usuario, defaults={'rol': rol})
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
        fields = [
            'id', 'usuario', 'direccion', 'fecha', 'estado', 'metodo_pago',
            'motivo_cancelacion', 'total', 'detalles'
        ]
        # El estado y el motivo de cancelación NUNCA se editan por escritura
        # directa del serializer: solo cambian a través de las acciones de
        # PedidoViewSet (pagar-tarjeta, confirmar-deposito, marcar-enviado,
        # marcar-entregado, cancelar), que validan el flujo correcto.
        read_only_fields = ['estado', 'motivo_cancelacion']

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


class PagoTarjetaSerializer(serializers.Serializer):
    """
    Datos del simulador de tarjeta (nunca se guardan en la base de datos,
    solo se usan en el momento para decidir aprobado/rechazado).
    """
    numero_tarjeta = serializers.RegexField(r'^\d{13,19}$')
    nombre_titular = serializers.CharField(max_length=100)
    mes_expiracion = serializers.IntegerField(min_value=1, max_value=12)
    anio_expiracion = serializers.IntegerField(min_value=2000, max_value=2100)
    cvv = serializers.RegexField(r'^\d{3,4}$')

    def validate_numero_tarjeta(self, valor):
        # Algoritmo de Luhn: el mismo checksum que usan las tarjetas reales,
        # para que un número "inventado a lo tonto" se rechace antes de
        # llegar a la simulación de aprobación/rechazo.
        digitos = [int(d) for d in valor]
        for i in range(len(digitos) - 2, -1, -2):
            digitos[i] *= 2
            if digitos[i] > 9:
                digitos[i] -= 9
        if sum(digitos) % 10 != 0:
            raise serializers.ValidationError('Número de tarjeta inválido.')
        return valor

    def validate(self, datos):
        from datetime import date
        hoy = date.today()
        if (datos['anio_expiracion'], datos['mes_expiracion']) < (hoy.year, hoy.month):
            raise serializers.ValidationError('La tarjeta está vencida.')
        return datos


class ResenaSerializer(serializers.ModelSerializer):
    usuario = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = Resena
        fields = ['id', 'usuario', 'producto', 'calificacion', 'comentario', 'fecha']

    def create(self, validated_data):
        usuario = self.context['request'].user
        return Resena.objects.create(usuario=usuario, **validated_data)


class PreguntaProductoSerializer(serializers.ModelSerializer):
    usuario = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = PreguntaProducto
        fields = ['id', 'producto', 'usuario', 'pregunta', 'respuesta', 'fecha_pregunta', 'fecha_respuesta']
        # respuesta/fecha_respuesta NUNCA se editan por escritura directa:
        # solo a través de la acción "responder" del ViewSet (solo admin).
        read_only_fields = ['respuesta', 'fecha_respuesta']

    def create(self, validated_data):
        usuario = self.context['request'].user
        return PreguntaProducto.objects.create(usuario=usuario, **validated_data)
