from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.exceptions import ValidationError
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import transaction
from rest_framework import filters
import re
import os
import json
import logging
import requests
import unicodedata

logger = logging.getLogger(__name__)

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


# ---------- Búsqueda inteligente de productos con IA (Gemini) — enfocada en el cliente ----------

# "gemini-flash-latest" es el alias que Google mostró en el quickstart de tu
# propia cuenta — a diferencia de un nombre de modelo específico (ej.
# "gemini-2.5-flash-lite"), este siempre apunta a un modelo Flash vigente,
# así que no se rompe si Google renombra versiones más adelante.
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-flash-latest')
GEMINI_URL = f'https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent'

# Conectores comunes que se descartan cuando NO hay IA disponible, para que
# el respaldo no busque literalmente "y", "de", "una", etc.
STOPWORDS_ES = {
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
    'y', 'o', 'que', 'en', 'a', 'para', 'con', 'por', 'es', 'son', 'ser',
    'quiero', 'busco', 'necesito', 'tengo', 'algo', 'tienen', 'tienes', 'hay',
    'mi', 'me', 'mí', 'muy', 'solo', 'sólo', 'esta', 'este', 'esto', 'ya',
    'pesos', 'peso',
}

TTL_CACHE_INTERPRETACION = 60 * 30   # 30 min: la misma pregunta no vuelve a gastar cuota
COOLDOWN_CUOTA_SEGUNDOS = 120        # tras un 429, no se reintenta con Gemini por 2 min
CLAVE_COOLDOWN_GEMINI = 'ia_gemini_cooldown_activo'
MAX_LARGO_CONSULTA = 300


class GeminiError(Exception):
    """Error genérico al hablar con la API de Gemini."""


class GeminiNoConfigurado(GeminiError):
    """Falta la variable de entorno GEMINI_API_KEY."""


class GeminiCuotaExcedida(GeminiError):
    """Se alcanzó el límite de peticiones del tier gratuito (HTTP 429)."""


class GeminiRespuestaBloqueada(GeminiError):
    """Gemini bloqueó la respuesta por sus filtros de seguridad de contenido."""


def _normalizar_texto(texto):
    """Quita acentos y pasa a minúsculas: 'Micrófono' y 'microfono' terminan
    siendo el mismo texto para efectos de búsqueda. Postgres sin la
    extensión 'unaccent' SÍ distingue acentos en icontains, así que esta
    normalización se hace en Python (ver _buscar_productos)."""
    if not texto:
        return ''
    descompuesto = unicodedata.normalize('NFKD', texto)
    return ''.join(c for c in descompuesto if not unicodedata.combining(c)).lower()


def _en_cooldown_por_cuota():
    return cache.get(CLAVE_COOLDOWN_GEMINI) is not None


def _activar_cooldown_por_cuota():
    cache.set(CLAVE_COOLDOWN_GEMINI, True, COOLDOWN_CUOTA_SEGUNDOS)


def _clave_cache_interpretacion(consulta):
    return f'ia_interpretacion:{_normalizar_texto(consulta)}'


def _extraer_presupuesto(consulta):
    """
    Detecta un presupuesto máximo mencionado explícitamente, ej. 'tengo 500
    pesos', 'menos de $300', 'máximo 1000'. Se hace con regex (no con IA)
    para que sea determinístico y funcione incluso en modo de respaldo, sin
    depender de que Gemini esté disponible.
    """
    patrones = [
        r'(?:tengo|con|presupuesto\s+de|hasta|m[aá]ximo|menos\s+de|no\s+m[aá]s\s+de)\s*\$?\s*([\d,]+(?:\.\d+)?)',
        r'\$\s*([\d,]+(?:\.\d+)?)',
    ]
    for patron in patrones:
        match = re.search(patron, consulta, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(',', ''))
            except ValueError:
                continue
    return None


def _construir_prompt_sistema(categorias):
    lista_categorias = ', '.join(categorias) if categorias else 'aún no hay categorías registradas'
    return (
        'Eres el asistente de compras de una tienda de instrumentos musicales y '
        'equipo de audio. El cliente te escribe lo que busca o necesita.\n\n'
        f'Categorías reales de la tienda: {lista_categorias}.\n\n'
        'Responde ÚNICAMENTE con un JSON con estos campos:\n'
        '- "mensaje": respuesta breve, natural y amable en español, como un '
        'vendedor conocedor (1-2 frases, sin emojis ni markdown).\n'
        '- "palabras_clave": lista de sustantivos simples en español para '
        'buscar en el catálogo. Nunca inventes nombres de productos ni marcas '
        'específicas que el cliente no mencionó.\n'
        '- "categoria_sugerida": si una de las categorías reales de arriba '
        'encaja claramente, escríbela EXACTAMENTE igual a como aparece en la '
        'lista; si ninguna encaja, deja este campo como cadena vacía.\n\n'
        'Si la consulta no tiene relación alguna con una tienda de música, '
        'dilo amablemente en "mensaje" y deja "palabras_clave" vacío.'
    )


def _interpretar_consulta(consulta, categorias):
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise GeminiNoConfigurado()

    payload = {
        'systemInstruction': {'parts': [{'text': _construir_prompt_sistema(categorias)}]},
        'contents': [{'parts': [{'text': consulta}]}],
        'generationConfig': {
            'responseMimeType': 'application/json',
            'responseSchema': {
                'type': 'OBJECT',
                'properties': {
                    'mensaje': {'type': 'STRING'},
                    'palabras_clave': {'type': 'ARRAY', 'items': {'type': 'STRING'}},
                    'categoria_sugerida': {'type': 'STRING'},
                },
                'required': ['mensaje', 'palabras_clave'],
            },
        },
    }

    INTENTOS = 2
    ultimo_error = None

    for intento in range(1, INTENTOS + 1):
        try:
            resp = requests.post(
                GEMINI_URL,
                headers={'Content-Type': 'application/json', 'X-goog-api-key': api_key},
                json=payload,
                timeout=25,
            )
        except requests.exceptions.RequestException as exc:
            # Timeout o problema de red: puede ser pasajero, se reintenta una vez.
            logger.warning('IA: intento %s/%s falló al conectar con Gemini: %s', intento, INTENTOS, exc)
            ultimo_error = exc
            continue

        if resp.status_code == 429:
            logger.warning('IA: cuota de Gemini excedida (429). Respuesta: %s', resp.text[:300])
            _activar_cooldown_por_cuota()
            raise GeminiCuotaExcedida()

        if resp.status_code != 200:
            # Este log es la parte clave para diagnosticar: aquí se ve el motivo
            # REAL del fallo (modelo mal escrito, key inválida, etc.) en la
            # consola donde corre "python manage.py runserver".
            logger.error('IA: Gemini respondió %s: %s', resp.status_code, resp.text[:500])
            raise GeminiError(f'Gemini respondió con estado {resp.status_code}')

        try:
            data = resp.json()
        except ValueError as exc:
            logger.error('IA: la respuesta de Gemini no es JSON válido: %s', exc)
            raise GeminiError('Respuesta de Gemini en formato inesperado')

        # Gemini puede bloquear la consulta completa por sus filtros de
        # seguridad ANTES de generar nada (promptFeedback.blockReason), o
        # bloquear la respuesta ya generada (finishReason == 'SAFETY').
        # Ambos casos se distinguen de un error técnico normal.
        bloqueo = (data.get('promptFeedback') or {}).get('blockReason')
        if bloqueo:
            logger.warning('IA: Gemini bloqueó la consulta por seguridad (%s)', bloqueo)
            raise GeminiRespuestaBloqueada()

        candidatos = data.get('candidates') or []
        if not candidatos:
            logger.error('IA: Gemini no devolvió candidatos. body=%s', resp.text[:500])
            raise GeminiError('Gemini no devolvió ninguna respuesta')

        candidato = candidatos[0]
        if candidato.get('finishReason') == 'SAFETY':
            logger.warning('IA: candidato bloqueado por seguridad (finishReason=SAFETY)')
            raise GeminiRespuestaBloqueada()

        partes = (candidato.get('content') or {}).get('parts') or []
        texto = partes[0].get('text') if partes else None
        if not texto:
            logger.error('IA: candidato sin texto utilizable. candidato=%s', candidato)
            raise GeminiError('Gemini devolvió una respuesta sin contenido de texto')

        try:
            return json.loads(texto)
        except json.JSONDecodeError as exc:
            logger.error('IA: no se pudo parsear el JSON de Gemini: %s | texto=%s', exc, texto[:500])
            raise GeminiError('Respuesta de Gemini en formato inesperado')

    # Se agotaron los intentos de conexión (timeout/red) sin obtener respuesta.
    logger.error('IA: no se pudo conectar con Gemini tras %s intentos: %s', INTENTOS, ultimo_error)
    raise GeminiError(str(ultimo_error))


def _palabras_clave_de_respaldo(consulta):
    """Sin IA disponible: separa la consulta en palabras y descarta
    conectores comunes en español, en vez de buscar la oración completa."""
    palabras = re.findall(r'[a-záéíóúüñ]+', consulta.lower())
    utiles = [p for p in palabras if p not in STOPWORDS_ES and len(p) > 2]
    return utiles or [consulta]


def _buscar_productos(palabras_clave, precio_maximo=None):
    """
    Filtra productos por palabras clave, sin distinguir acentos ni
    mayúsculas, y opcionalmente por presupuesto máximo.

    La comparación de texto se hace en Python y no con icontains de
    Postgres: sin la extensión 'unaccent' habilitada en la base de datos,
    Postgres SÍ distingue acentos ('microfono' no encontraría 'Micrófono').
    Para un catálogo del tamaño de un proyecto escolar, traer los productos
    y comparar en memoria es rápido y evita depender de una extensión de
    Postgres que podría no estar disponible o requerir permisos que el
    usuario de la base de datos no tenga.
    """
    queryset = Producto.objects.select_related('categoria').prefetch_related('imagenes').all()
    if precio_maximo is not None:
        queryset = queryset.filter(precio__lte=precio_maximo)

    productos = list(queryset)

    palabras_utiles = [p for p in (palabras_clave or []) if p and not p.isdigit()]
    if not palabras_utiles:
        return productos

    palabras_normalizadas = [_normalizar_texto(p) for p in palabras_utiles]

    seleccionados = []
    for producto in productos:
        texto_producto = _normalizar_texto(
            f'{producto.nombre} {producto.descripcion} '
            f'{producto.categoria.nombre if producto.categoria_id else ""}'
        )
        if any(palabra in texto_producto for palabra in palabras_normalizadas):
            seleccionados.append(producto)
    return seleccionados


class BusquedaIAThrottle(SimpleRateThrottle):
    """
    Límite propio de peticiones a este endpoint (30 por minuto, por IP), para
    que un doble clic o un bucle accidental en el frontend no agote la cuota
    gratuita de Gemini. A diferencia de AnonRateThrottle (que solo limita a
    quien NO tiene sesión), esta clase limita a cualquiera que llame al
    endpoint, esté o no logueado, usando siempre la IP como identificador.

    "rate" se define aquí mismo como atributo de clase a propósito: DRF solo
    exige agregar algo a settings.py (DEFAULT_THROTTLE_RATES) cuando se usa
    "scope" sin "rate" explícito. Al ponerlo aquí, todo el comportamiento del
    límite queda en un solo lugar, sin tocar settings.py.
    """
    scope = 'busqueda_ia'
    rate = '30/min'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([BusquedaIAThrottle])
def busqueda_inteligente(request):
    """
    Búsqueda inteligente de productos para el CLIENTE — pública, sin login,
    igual que ya se puede hacer GET a /api/productos/ sin autenticarse.
    (Si mandas un token vencido en Postman de todos modos te dará 401 antes
    de llegar aquí: quita el header Authorization para probar este endpoint.)

    POST /api/ia/   body: {"consulta": "quiero un micrófono para grabar podcasts"}

    Solo toca catálogo público (Producto/Categoria) — nunca ventas, stock
    interno ni datos de otros usuarios.
    """
    consulta = request.data.get('consulta')
    consulta = str(consulta).strip() if consulta is not None else ''

    if not consulta:
        return Response(
            {'error': 'El campo "consulta" no puede estar vacío'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if len(consulta) > MAX_LARGO_CONSULTA:
        return Response(
            {'error': f'La consulta es demasiado larga (máximo {MAX_LARGO_CONSULTA} caracteres).'},
            status=status.HTTP_400_BAD_REQUEST
        )

    presupuesto_maximo = _extraer_presupuesto(consulta)

    usando_ia = True
    desde_cache = False
    aviso = None
    categoria_sugerida = None
    mensaje = None

    clave_cache = _clave_cache_interpretacion(consulta)
    interpretacion_cacheada = cache.get(clave_cache)

    try:
        if interpretacion_cacheada is not None:
            interpretacion = interpretacion_cacheada
            desde_cache = True
        elif _en_cooldown_por_cuota():
            logger.info('IA: en cooldown por cuota excedida, se usa el respaldo sin llamar a Gemini.')
            raise GeminiCuotaExcedida()
        else:
            categorias = list(Categoria.objects.values_list('nombre', flat=True))
            interpretacion = _interpretar_consulta(consulta, categorias)
            cache.set(clave_cache, interpretacion, TTL_CACHE_INTERPRETACION)

        palabras_clave = [p for p in interpretacion.get('palabras_clave', []) if p] or _palabras_clave_de_respaldo(consulta)
        categoria_sugerida = interpretacion.get('categoria_sugerida') or None
        mensaje = interpretacion.get('mensaje') or None

    except GeminiNoConfigurado:
        usando_ia = False
        aviso = 'La búsqueda con IA no está configurada (falta GEMINI_API_KEY en el .env). Mostrando búsqueda por palabras.'
        palabras_clave = _palabras_clave_de_respaldo(consulta)
    except GeminiCuotaExcedida:
        usando_ia = False
        aviso = 'Se alcanzó el límite de uso gratuito de Gemini por ahora. Mostrando búsqueda por palabras mientras tanto.'
        palabras_clave = _palabras_clave_de_respaldo(consulta)
    except GeminiRespuestaBloqueada:
        usando_ia = False
        aviso = 'Tu búsqueda no pudo procesarse por los filtros de seguridad del asistente. Intenta reformularla.'
        palabras_clave = _palabras_clave_de_respaldo(consulta)
    except GeminiError:
        usando_ia = False
        aviso = 'No se pudo contactar al asistente de IA en este momento. Mostrando búsqueda por palabras.'
        palabras_clave = _palabras_clave_de_respaldo(consulta)

    productos = _buscar_productos(palabras_clave, presupuesto_maximo)
    total = len(productos)
    serializer = ProductoSerializer(productos, many=True, context={'request': request})

    if not mensaje:
        # Respaldo sin IA (o la IA no mandó mensaje): texto genérico pero
        # que igual se siente como respuesta, no como un JSON pelón.
        if total == 0 and presupuesto_maximo is not None:
            mensaje = (
                f'No encontré productos por ${presupuesto_maximo:,.2f} o menos con esas palabras. '
                '¿Ajustamos el presupuesto o la búsqueda?'
            )
        elif total == 0:
            mensaje = 'No encontré productos que coincidan con tu búsqueda. ¿Puedes describirlo de otra forma?'
        elif total == 1:
            mensaje = 'Encontré 1 producto que podría interesarte:'
        else:
            mensaje = f'Encontré {total} productos que podrían interesarte:'

    return Response({
        'consulta': consulta,
        'mensaje': mensaje,
        'usando_ia': usando_ia,
        'desde_cache': desde_cache,
        'aviso': aviso,
        'palabras_clave_interpretadas': palabras_clave,
        'categoria_sugerida': categoria_sugerida,
        'presupuesto_detectado': presupuesto_maximo,
        'total_resultados': total,
        'productos': serializer.data,
    }, status=status.HTTP_200_OK)
