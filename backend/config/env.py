from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False)

    secret_key: str
    debug: bool
    allowed_hosts: str
    database_url: str

    @property
    def hosts(self) -> list[str]:
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]


env = Env()
