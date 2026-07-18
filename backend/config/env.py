from urllib.parse import unquote, urlparse

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
    google_client_id: str | None = None
    google_client_secret: str | None = None

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
    def hosts(self) -> list[str]:
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]

    @property
    def database(self) -> dict[str, str]:
        url = urlparse(str(self.database_url))
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": unquote(url.path.lstrip("/")),
            "USER": unquote(url.username or ""),
            "PASSWORD": unquote(url.password or ""),
            "HOST": url.hostname or "",
            "PORT": str(url.port or 5432),
        }


env = Env()
