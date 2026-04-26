from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    llm_provider: str = "openai"
    llm_model: str = "gpt-4-turbo-preview"
    model: Optional[str] = None

    mock_mode: bool = False

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ]

    max_task_output_chars: int = 50000
    max_conclusion_chars: int = 10000
    max_thought_chars: int = 5000

    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra='ignore'
    )

    def validate_llm_config(self):
        if self.llm_provider == "openai" and not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when using OpenAI")
        if self.llm_provider == "anthropic" and not self.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required when using Anthropic")

settings = Settings()
