import os
from dataclasses import dataclass

@dataclass(frozen=True)
class BotConfig:
    """Server-side configuration for EduCenter Telegram Bot.
    Never expose TELEGRAM_BOT_TOKEN or SUPABASE_SERVICE_ROLE_KEY in frontend bundles.
    """
    telegram_bot_token: str
    supabase_url: str
    supabase_service_role_key: str

    @classmethod
    def from_env(cls) -> "BotConfig":
        token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not token or not url or not service_key:
            raise EnvironmentError(
                "Missing required server environment variables: "
                "TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY"
            )
        return cls(
            telegram_bot_token=token,
            supabase_url=url,
            supabase_service_role_key=service_key,
        )
