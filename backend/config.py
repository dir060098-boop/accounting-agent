from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str = "sqlite:///./accounting.db"
    secret_key: str = "change-me-in-production"
    environment: str = "development"
    claude_model: str = "claude-sonnet-4-6"
    max_tokens: int = 2048

    class Config:
        env_file = ".env"


settings = Settings()
