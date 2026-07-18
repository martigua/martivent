from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from config.env import env

CLUB_CONTEXT = {
    "name": "Martigua Sports Culture Loisirs",
    "sport": "Handball",
    "location": "Paris 19e",
    "founded_year": 1978,
    "team_count": 7,
    "licensed_member_count": 230,
}

CLUB_STAT_FIELDS = (
    ("founded_year", "Fondé en"),
    ("team_count", "Équipes"),
    ("licensed_member_count", "Licencié·es"),
)


class ClubStatSerializer(serializers.Serializer):
    label = serializers.CharField()
    value = serializers.CharField()


class ClubContextSerializer(serializers.Serializer):
    name = serializers.CharField()
    sport = serializers.CharField()
    location = serializers.CharField()
    founded_year = serializers.IntegerField()
    team_count = serializers.IntegerField()
    licensed_member_count = serializers.IntegerField()
    stats = ClubStatSerializer(many=True)


class AuthenticationContextSerializer(serializers.Serializer):
    google = serializers.BooleanField()


class ApplicationContextSerializer(serializers.Serializer):
    club = ClubContextSerializer()
    authentication = AuthenticationContextSerializer()


@extend_schema(responses=ApplicationContextSerializer)
@api_view(["GET"])
@permission_classes([AllowAny])
def application_context_view(request):
    club = {
        **CLUB_CONTEXT,
        "stats": [
            {
                "label": label,
                "value": str(CLUB_CONTEXT[field]),
            }
            for field, label in CLUB_STAT_FIELDS
        ],
    }

    return Response(
        {
            "club": club,
            "authentication": {
                "google": env.google_enabled,
            },
        }
    )
