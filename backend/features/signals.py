from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .flags import invalidate
from .models import SectionVisibility


@receiver(post_save, sender=SectionVisibility)
@receiver(post_delete, sender=SectionVisibility)
def _clear_flag_cache(**_kwargs):
    invalidate()
