import pytest
from django.contrib.auth import get_user_model


@pytest.mark.django_db
def test_user_uses_email_as_identifier():
    User = get_user_model()
    user = User.objects.create_user(email="Coach@Martigua.fr", password="pw12345!")

    assert user.email == "Coach@martigua.fr"
    assert user.get_username() == "Coach@martigua.fr"
    assert user.check_password("pw12345!")


@pytest.mark.django_db
def test_superuser_flags():
    User = get_user_model()
    superuser = User.objects.create_superuser(
        email="admin@martigua.fr",
        password="pw12345!",
    )

    assert superuser.is_staff
    assert superuser.is_superuser
