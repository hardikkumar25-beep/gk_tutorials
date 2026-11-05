from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "G.K. Tutorials API"
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 480
    admin_name: str = "Institute Admin"
    admin_email: str
    admin_password: str
    frontend_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


settings = Settings()
