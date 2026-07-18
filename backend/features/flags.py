from .models import Feature


def variant_for(key, *, user=None, scope=None):
    feature = Feature.objects.get(key=key)
    rules = feature.rules.select_related("user", "role", "group", "scope")
    for rule in rules:
        if rule.matches(user=user, scope=scope):
            return rule.variant
    return feature.default_variant


def all_variants(*, user=None, scope=None):
    return {
        feature.key: variant_for(feature.key, user=user, scope=scope)
        for feature in Feature.objects.all()
    }
