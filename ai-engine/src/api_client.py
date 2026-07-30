"""Cliente HTTP hacia el backend Express de Mallki Sapan."""
from typing import Any
import requests

from . import config


class BackendError(Exception):
    pass


def _url(path: str) -> str:
    return f"{config.BACKEND_URL}{path}"


def get_sensors() -> list[dict[str, Any]]:
    r = requests.get(_url("/api/sensors"), timeout=10)
    r.raise_for_status()
    return r.json()


def get_readings(sensor_id: str, hours: int = 6) -> list[dict[str, Any]]:
    r = requests.get(
        _url(f"/api/sensors/{sensor_id}/readings"),
        params={"hours": hours},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def create_alert(alert: dict[str, Any]) -> dict[str, Any]:
    r = requests.post(_url("/api/alerts"), json=alert, timeout=10)
    r.raise_for_status()
    return r.json()


def can_irrigate() -> dict[str, Any]:
    r = requests.get(_url("/api/irrigation/can-irrigate"), timeout=10)
    r.raise_for_status()
    return r.json()


def irrigate_auto(zone_ids: list[str], duration: int) -> dict[str, Any]:
    """Dispara riego por decisión de IA. Puede devolver 409 si el nivel es bajo."""
    r = requests.post(
        _url("/api/irrigation/auto"),
        json={"zoneIds": zone_ids, "duration": duration, "trigger": "ai_decision"},
        timeout=10,
    )
    if r.status_code == 409:
        raise BackendError(f"Riego bloqueado por el backend: {r.json().get('error')}")
    r.raise_for_status()
    return r.json()


def get_zones() -> list[dict[str, Any]]:
    r = requests.get(_url("/api/irrigation/zones"), timeout=10)
    r.raise_for_status()
    return r.json()
