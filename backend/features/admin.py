from django.contrib import admin

from .models import Feature, FeatureRule


class FeatureRuleInline(admin.TabularInline):
    model = FeatureRule
    extra = 0
    ordering = ("priority",)
    autocomplete_fields = ("user", "role", "group", "scope")


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ("key", "default_variant")
    search_fields = ("key", "description")
    inlines = (FeatureRuleInline,)
