from functools import lru_cache
from typing import List, Literal, Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: Literal["development", "staging", "production"] = "development"
    debug: bool = True
    agent_jwt_secret: Optional[str] = None
    agent_api_key_pepper: Optional[str] = None
    agent_auth_rate_limit: int = 10
    agent_auth_rate_window_seconds: int = 60
    agent_v3_enabled: bool = False

    db_host: str = "localhost"
    db_port: int = 5433
    db_user: str = "trading"
    db_pass: str = "trading_pass"
    db_name: str = "trading_strategy_center"

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    lru_cache_size: int = 1000
    redis_cache_ttl: int = 300

    initial_capital: float = 1_000_000.0  # 妯℃嫙璐︽埛鍒濆璧勯噾
    max_position_size: int = 100
    max_drawdown_pct: float = 0.15
    max_leverage: float = 3.0

    cors_origins: List[str] = ["*"]

    # DeepSeek API Configuration
    deepseek_api_key: Optional[str] = None
    deepseek_api_base: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"
    deepseek_max_tokens: int = 4096
    deepseek_temperature: float = 0.7

    # OpenAI API Configuration (for comparison)
    openai_api_key: Optional[str] = None
    openai_api_base: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4"

    # Claude API Configuration (for comparison)
    claude_api_key: Optional[str] = None
    claude_model: str = "claude-3-opus-20240229"

    # Default LLM provider
    default_llm_provider: Literal["deepseek", "openai", "claude"] = "deepseek"

    # 鏁版嵁婧愬嚟鎹?(鍙€? 鐣欑┖鍒欏搴旀簮涓嶅惎鐢?
    tushare_token: Optional[str] = None
    tq_account: Optional[str] = None
    tq_password: Optional[str] = None

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.env == "production":
            missing = [name for name in ("agent_jwt_secret", "agent_api_key_pepper") if not getattr(self, name)]
            if missing:
                raise ValueError(f"Missing production secrets: {', '.join(missing)}")
        return self

    @property
    def resolved_agent_jwt_secret(self) -> str:
        return self.agent_jwt_secret or "development-only-agent-jwt-secret"

    @property
    def resolved_agent_api_key_pepper(self) -> str:
        return self.agent_api_key_pepper or "development-only-agent-api-key-pepper"

    @property
    def db_url(self) -> str:
        return f"postgresql+asyncpg://{self.db_user}:{self.db_pass}@{self.db_host}:{self.db_port}/{self.db_name}"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
