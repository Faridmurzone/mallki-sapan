"""Motor de IA de Mallki Sapan.

Cada POLL_INTERVAL_SEC:
  1. Lee los sensores del backend.
  2. Evalúa cada uno contra los rangos hidropónicos y crea alertas (con cooldown).
  3. Detecta caídas rápidas de nivel.
  4. (Opcional) decide riego por IA respetando el chequeo de nivel del backend.

Correr:  python -m src.main   (desde ai-engine/)
"""
import time
import traceback

from . import analysis, api_client, config
from .advisor import recommend

# Cooldown de alertas: key -> monotonic timestamp del último envío.
_last_alert: dict[str, float] = {}


def _cooldown_ok(key: str) -> bool:
    now = time.monotonic()
    last = _last_alert.get(key)
    if last is not None and (now - last) < config.ALERT_COOLDOWN_SEC:
        return False
    _last_alert[key] = now
    return True


def _emit_alert(alert: dict) -> None:
    key = alert.pop("_key")
    if not _cooldown_ok(key):
        return
    alert["aiRecommendation"] = recommend(alert)
    try:
        api_client.create_alert(alert)
        print(f"  ⚠ alerta [{alert['severity']}] {alert['title']}")
    except Exception as e:  # noqa: BLE001
        print(f"  !! no se pudo crear la alerta: {e}")


def tick() -> None:
    sensors = api_client.get_sensors()
    by_type: dict[str, dict] = {}

    for s in sensors:
        if s.get("type") in analysis.HYDRO_RANGES:
            by_type.setdefault(s["type"], s)  # primer sensor de cada tipo (para decisiones)
            alert = analysis.evaluate(s)
            if alert:
                _emit_alert(alert)

    # Caída rápida de nivel del tanque
    level = by_type.get("water_level")
    if level:
        try:
            readings = api_client.get_readings(level["id"], hours=6)
            drop_msg = analysis.detect_rapid_drop(readings)
            if drop_msg:
                _emit_alert({
                    "type": "irrigation", "severity": "high",
                    "title": "Caída rápida de nivel", "message": drop_msg,
                    "_key": f"{level['id']}:drop",
                })
        except Exception as e:  # noqa: BLE001
            print(f"  (no se pudieron leer históricos de nivel: {e})")

    # Riego por decisión de IA (opcional)
    if config.AI_IRRIGATION_ENABLED:
        reason = analysis.should_irrigate(by_type)
        if reason:
            try:
                zones = api_client.get_zones()
                if zones:
                    api_client.irrigate_auto([zones[0]["id"]], duration=10)
                    print(f"  💧 riego IA disparado: {reason}")
            except api_client.BackendError as e:
                print(f"  (riego IA no ejecutado: {e})")
            except Exception as e:  # noqa: BLE001
                print(f"  (error al intentar riego IA: {e})")


def main() -> None:
    print(f"🧠 Mallki Sapan AI-engine → {config.BACKEND_URL} (cada {config.POLL_INTERVAL_SEC}s)")
    print(f"   Claude: {'activo (' + config.CLAUDE_MODEL + ')' if config.ANTHROPIC_API_KEY else 'fallback por reglas'}")
    while True:
        try:
            tick()
        except Exception:  # noqa: BLE001 - el loop nunca debe morir por un error puntual
            print("Error en el ciclo de análisis:")
            traceback.print_exc()
        time.sleep(config.POLL_INTERVAL_SEC)


if __name__ == "__main__":
    main()
