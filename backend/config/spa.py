from django.conf import settings
from django.http import FileResponse, Http404


def spa_index(_request):
    if settings.WHITENOISE_ROOT is None:
        raise Http404

    index = settings.WHITENOISE_ROOT / "index.html"
    if not index.is_file():
        raise Http404
    return FileResponse(index.open("rb"), content_type="text/html")
