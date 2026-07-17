from urllib.parse import urlparse

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class FeatureFlags(BaseModel):
    """Developer-owned env flags. Add one field per unfinished feature; delete on ship."""

    selection: bool = False


class Env(BaseSettings):
    model_config = SettingsConfigDict(env_nested_delimiter="__", extra="ignore")

    secret_key: str = "dev-insecure-do-not-use-in-prod"
    debug: bool = False
    allowed_hosts: str = "localhost,127.0.0.1"
    database_url: str = "postgres://martivent:martivent@db:5432/martivent"
    google_client_id: str = ""
    google_secret: str = ""
    features: FeatureFlags = FeatureFlags()

    @property
    def database(self) -> dict:
        u = urlparse(self.database_url)
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": u.path.lstrip("/"),
            "USER": u.username,
            "PASSWORD": u.password,
            "HOST": u.hostname,
            "PORT": str(u.port or 5432),
        }

    @property
    def hosts(self) -> list[str]:
        return [h.strip() for h in self.allowed_hosts.split(",") if h.strip()]


env = Env()  # built at import: a malformed env crashes boot instead of reading a silent default
