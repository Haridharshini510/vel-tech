from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "industrypulse"
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""
    llm_api_key: str = ""
    llm_base_url: str = "https://api.lightningai.studio/v1"
    llm_model: str = "gpt-3.5-turbo"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
