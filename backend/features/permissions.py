from functools import wraps

from django.http import Http404
from rest_framework.permissions import BasePermission

from .flags import is_enabled


def feature_required(key: str) -> type[BasePermission]:
    class _FeatureEnabled(BasePermission):
        def has_permission(self, request, view):
            if not is_enabled(key):
                raise Http404
            return True

    return _FeatureEnabled


def requires_feature(key: str):
    def decorator(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            if not is_enabled(key):
                raise Http404
            return view(request, *args, **kwargs)

        return wrapper

    return decorator
