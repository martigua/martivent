import pytest
from django.core.cache import cache
from django.http import Http404
from django.test import RequestFactory

from config.env import FeatureFlags

from .flags import all_flags, is_enabled
from .models import SectionVisibility


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_env_off_masks_db_on(settings):
    settings.FEATURES = FeatureFlags(selection=False)
    SectionVisibility.objects.create(key="selection", enabled=True, label="Selection")

    assert is_enabled("selection") is False


@pytest.mark.django_db
def test_db_flag_when_absent_from_env():
    SectionVisibility.objects.create(key="adhesion", enabled=True, label="Adhésion")

    assert is_enabled("adhesion") is True


@pytest.mark.django_db
def test_cache_invalidated_on_save():
    visibility = SectionVisibility.objects.create(
        key="adhesion",
        enabled=False,
        label="Adhésion",
    )
    assert is_enabled("adhesion") is False

    visibility.enabled = True
    visibility.save()

    assert is_enabled("adhesion") is True


@pytest.mark.django_db
def test_all_flags_merges_env_and_db(settings):
    settings.FEATURES = FeatureFlags(selection=False)
    SectionVisibility.objects.create(key="adhesion", enabled=True, label="Adhésion")

    assert all_flags() == {"selection": False, "adhesion": True}


@pytest.mark.django_db
def test_permission_raises_404_when_off(settings):
    settings.FEATURES = FeatureFlags(selection=False)

    from .permissions import feature_required

    permission = feature_required("selection")()
    with pytest.raises(Http404):
        permission.has_permission(RequestFactory().get("/"), view=None)


@pytest.mark.django_db
def test_decorator_raises_404_when_off(settings):
    settings.FEATURES = FeatureFlags(selection=False)

    from .permissions import requires_feature

    @requires_feature("selection")
    def view(_request):
        return "ok"

    with pytest.raises(Http404):
        view(RequestFactory().get("/"))


@pytest.mark.django_db
def test_flags_endpoint_returns_merged_map(client, settings):
    settings.FEATURES = FeatureFlags(selection=False)
    SectionVisibility.objects.create(key="adhesion", enabled=True, label="Adhésion")

    response = client.get("/api/flags/")

    assert response.status_code == 200
    assert response.json() == {"selection": False, "adhesion": True}
