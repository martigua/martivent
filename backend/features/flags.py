from django.conf import settings
from django.core.cache import cache

from .models import SectionVisibility

_CACHE_KEY = "features:section_visibility"
_CACHE_TTL = 300


def _db_flags() -> dict[str, bool]:
    flags = cache.get(_CACHE_KEY)
    if flags is None:
        flags = dict(SectionVisibility.objects.values_list("key", "enabled"))
        cache.set(_CACHE_KEY, flags, _CACHE_TTL)
    return flags


def invalidate() -> None:
    cache.delete(_CACHE_KEY)


def is_enabled(key: str) -> bool:
    environment_flags = settings.FEATURES.model_dump()
    if key in environment_flags and environment_flags[key] is False:
        return False
    return _db_flags().get(key, False)


def all_flags() -> dict[str, bool]:
    keys = set(settings.FEATURES.model_dump()) | set(_db_flags())
    return {key: is_enabled(key) for key in keys}
