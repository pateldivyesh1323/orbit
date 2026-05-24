from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    mongodb_uri: str
    mongodb_db_name: str = "orbit"


settings = Settings()
