from django.http import Http404
from rest_framework.permissions import BasePermission

from .flags import variant_for
from .models import Feature


def feature_variant(key, expected, *, scope_getter=None):
    class HasFeatureVariant(BasePermission):
        def has_permission(self, request, view):
            scope = scope_getter(request, view) if scope_getter else None
            try:
                selected = variant_for(key, user=request.user, scope=scope)
            except Feature.DoesNotExist as error:
                raise Http404 from error
            if selected != expected:
                raise Http404
            return True

    HasFeatureVariant.__name__ = f"Feature_{key}_{expected}"
    return HasFeatureVariant
