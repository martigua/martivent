from drf_spectacular.utils import OpenApiTypes, extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from access.decisions import effective_capabilities
from features.flags import all_variants


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(
        {
            "id": request.user.pk,
            "email": request.user.email,
            "capabilities": effective_capabilities(request.user),
            "features": all_variants(user=request.user),
        }
    )
