from rest_framework import serializers


class CapabilitySourceSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=("direct", "role", "group", "superuser"))
    name = serializers.CharField()
    scope = serializers.CharField(allow_null=True)


class CurrentUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    is_validated = serializers.BooleanField()
    capabilities = serializers.DictField(child=CapabilitySourceSerializer(many=True))
    features = serializers.DictField(child=serializers.CharField())
