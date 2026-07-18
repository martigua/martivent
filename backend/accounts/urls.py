from django.urls import path

from .views import me_view

urlpatterns = [
    path("me/", me_view, name="me"),
]
