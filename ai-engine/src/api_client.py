"""Cliente HTTP hacia el backend Express de Mallki Sapan."""
from typing import Any, Optional
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


# --- Fotos ----------------------------------------------------------------


def claim_photo(stale_after_sec: int) -> Optional[dict[str, Any]]:
    """Toma la próxima foto para analizar.

    El backend elige la más reciente y descarta las pendientes más viejas, todo
    en una transacción. Devuelve None (204) si no hay nada para analizar.
    """
    r = requests.post(
        _url("/api/photos/analysis/claim"),
        json={"staleAfterSec": stale_after_sec},
        timeout=15,
    )
    if r.status_code == 204:
        return None
    r.raise_for_status()
    return r.json()


def submit_analysis(photo_id: str, analysis: dict[str, Any]) -> dict[str, Any]:
    r = requests.post(_url(f"/api/photos/{photo_id}/analysis"), json=analysis, timeout=15)
    r.raise_for_status()
    return r.json()


def discard_analysis(photo_id: str, reason: str, status: str = "failed") -> None:
    """Marca la foto como `failed` o `skipped` para que no se reintente en loop."""
    r = requests.post(
        _url(f"/api/photos/{photo_id}/analysis/discard"),
        json={"reason": reason[:500], "status": status},
        timeout=10,
    )
    r.raise_for_status()


def download_photo(photo: dict[str, Any]) -> bytes:
    """Baja el JPEG de una foto.

    Primero por su `url` pública. Si esa URL se armó con un PUBLIC_BASE_URL que
    desde acá no resuelve (típico en Docker), se cae al path de storage sobre
    BACKEND_URL, que sí sabemos alcanzable porque venimos hablando con él.
    """
    candidatas: list[str] = []
    url = photo.get("url")
    if url:
        candidatas.append(url if url.startswith("http") else _url(url))
    if photo.get("storageKey"):
        candidatas.append(_url(f"/storage/{photo['storageKey']}"))

    ultimo_error: Optional[Exception] = None
    for candidata in candidatas:
        try:
            r = requests.get(candidata, timeout=30)
            r.raise_for_status()
            return r.content
        except Exception as e:  # noqa: BLE001 - probamos la siguiente candidata
            ultimo_error = e

    raise BackendError(f"No se pudo descargar la imagen de la foto {photo.get('id')}: {ultimo_error}")
