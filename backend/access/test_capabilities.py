import pytest
from django.contrib.auth.models import Permission

from . import capabilities


@pytest.mark.django_db
def test_every_catalog_entry_resolves_to_a_real_permission():
    for name in capabilities.permission_names():
        app_label, codename = name.split(".")
        assert Permission.objects.filter(
            content_type__app_label=app_label,
            codename=codename,
        ).exists(), f"catalog references missing permission {name}"


def test_label_falls_back_to_raw_name_when_uncatalogued():
    assert capabilities.label_for("does.not_exist") == "does.not_exist"
    assert capabilities.label_for("access.change_role") == "Manage roles"
