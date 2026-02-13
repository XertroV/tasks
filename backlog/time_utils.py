"""UTC datetime helpers with backward compatibility for naive timestamps."""

from datetime import datetime, timezone
from typing import Optional


def utc_now() -> datetime:
    """Return a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    """Return current UTC datetime as ISO 8601."""
    return utc_now().isoformat()


def to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Normalize naive/aware datetimes to timezone-aware UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)
