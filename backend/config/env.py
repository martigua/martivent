from urllib.parse import parse_qsl, unquote, urlparse

from pydantic import PostgresDsn, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_nested_delimiter="__",
    )

    secret_key: str
    debug: bool
    allowed_hosts: str
    database_url: PostgresDsn
    secure_ssl_redirect: bool | None = None
    google_client_id: str | None = None
    google_client_secret: str | None = None

    @field_validator("secret_key")
    @classmethod
    def secret_key_is_not_blank(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("SECRET_KEY must not be blank")
        return value

    @field_validator("allowed_hosts")
    @classmethod
    def allowed_hosts_are_not_blank(cls, value):
        if not any(host.strip() for host in value.split(",")):
            raise ValueError("ALLOWED_HOSTS must contain at least one host")
        return value

    @field_validator("google_client_id", "google_client_secret", mode="before")
    @classmethod
    def blank_google_credentials_are_absent(cls, value):
        if isinstance(value, str):
            return value.strip() or None
        return value

    @model_validator(mode="after")
    def validate_google_credentials(self):
        if bool(self.google_client_id) != bool(self.google_client_secret):
            raise ValueError("Google OAuth credentials must be configured together")
        return self

    @property
    def google_enabled(self) -> bool:
        return self.google_client_id is not None

    @property
    def ssl_redirect(self) -> bool:
        if self.secure_ssl_redirect is not None:
            return self.secure_ssl_redirect
        return not self.debug

    @property
    def hosts(self) -> list[str]:
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]

    @property
    def database(self) -> dict[str, object]:
        url = urlparse(str(self.database_url))
        database = {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": unquote(url.path.lstrip("/")),
            "USER": unquote(url.username or ""),
            "PASSWORD": unquote(url.password or ""),
            "HOST": url.hostname or "",
            "PORT": str(url.port or 5432),
        }
        options = dict(parse_qsl(url.query, keep_blank_values=True))
        if options:
            database["OPTIONS"] = options
        return database


env = Env()
