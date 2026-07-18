from django.urls import path

from .views import flags_view

urlpatterns = [
    path("flags/", flags_view, name="flags"),
]
