from rest_framework.permissions import BasePermission

from .decisions import decide


def has_capability(permission_name, *, scope_getter=None, target_getter=None):
    class HasCapability(BasePermission):
        def has_permission(self, request, view):
            scope = scope_getter(request, view) if scope_getter else None
            target = target_getter(request, view) if target_getter else None
            decision = decide(
                request.user,
                permission_name,
                scope=scope,
                target=target,
            )
            decisions = getattr(request, "capability_decisions", {})
            decisions[permission_name] = decision
            request.capability_decisions = decisions
            return decision.allowed

    HasCapability.__name__ = f"HasCapability_{permission_name.replace('.', '_')}"
    return HasCapability
