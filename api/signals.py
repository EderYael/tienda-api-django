from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Perfil


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def crear_perfil_automaticamente(sender, instance, created, **kwargs):
    if created:
        rol_default = 'administrador' if instance.is_superuser else 'registrado'
        Perfil.objects.get_or_create(usuario=instance, defaults={'rol': rol_default})
