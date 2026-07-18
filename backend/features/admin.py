from django.contrib import admin

from .models import SectionVisibility


@admin.register(SectionVisibility)
class SectionVisibilityAdmin(admin.ModelAdmin):
    list_display = ("label", "key", "enabled")
    list_editable = ("enabled",)
    search_fields = ("key", "label")
