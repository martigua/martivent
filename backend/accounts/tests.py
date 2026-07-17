import pytest
from django.contrib.auth import get_user_model


@pytest.mark.django_db
def test_user_uses_email_as_identifier():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        email="Coach@Martigua.fr",
        password="pw12345!",
    )

    assert user.email == "Coach@martigua.fr"
    assert user.get_username() == "Coach@martigua.fr"
    assert user.check_password("pw12345!")


@pytest.mark.django_db
def test_superuser_flags_are_enforced():
    user_model = get_user_model()
    superuser = user_model.objects.create_superuser(
        email="admin@martigua.fr",
        password="pw12345!",
    )

    assert superuser.is_staff
    assert superuser.is_superuser

    with pytest.raises(ValueError, match="is_staff=True"):
        user_model.objects.create_superuser(
            email="invalid@martigua.fr",
            password="pw12345!",
            is_staff=False,
        )
