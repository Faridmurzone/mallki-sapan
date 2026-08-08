"""Motor de IA de Mallki Sapan.

Cada POLL_INTERVAL_SEC:
  1. Lee los sensores del backend.
  2. Evalúa cada uno contra los rangos hidropónicos y crea alertas (con cooldown).
  3. Detecta caídas rápidas de nivel.
  4. (Opcional) decide riego por IA respetando el chequeo de nivel del backend.
  5. Analiza una foto de la cámara con Claude, como mucho una cada
     PHOTO_ANALYSIS_INTERVAL_SEC.

Correr:  python -m src.main   (desde ai-engine/)
"""
import time
import traceback

from . import analysis, api_client, config, vision
from .advisor import recommend

# Cooldown de alertas: key -> monotonic timestamp del último envío.
_last_alert: dict[str, float] = {}

# Cuándo se analizó una foto por última vez. Empieza en None para que el
# primer ciclo analice enseguida en vez de esperar una hora.
_last_photo_analysis: float | None = None

# Para avisar una sola vez que falta la API key en lugar de en cada ciclo.
_aviso_sin_key = False


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


def _process_photos() -> None:
    """Analiza como mucho una foto por ciclo, respetando el intervalo configurado.

    El backend hace el trabajo pesado en su endpoint de claim: elige la foto
    más reciente y descarta las pendientes más viejas en la misma transacción.
    Acá sólo decidimos *cuándo* pedir una.
    """
    global _last_photo_analysis, _aviso_sin_key

    if not config.PHOTO_ANALYSIS_ENABLED:
        return

    # Sin API key no hay análisis posible, y tampoco tomamos la foto: si la
    # tomáramos, el claim descartaría las anteriores sin haber mirado ninguna.
    if not config.ANTHROPIC_API_KEY:
        if not _aviso_sin_key:
            print("  (análisis de fotos inactivo: falta ANTHROPIC_API_KEY)")
            _aviso_sin_key = True
        return

    ahora = time.monotonic()
    if _last_photo_analysis is not None:
        faltan = config.PHOTO_ANALYSIS_INTERVAL_SEC - (ahora - _last_photo_analysis)
        if faltan > 0:
            return

    claim = api_client.claim_photo(config.PHOTO_ANALYSIS_STALE_SEC)
    if claim is None:
        return  # no hay fotos esperando

    photo = claim["photo"]
    photo_id = photo["id"]
    descartadas = claim.get("skipped", 0)
    print(f"  📷 analizando foto {photo_id}"
          + (f" (se descartaron {descartadas} más viejas)" if descartadas else ""))

    # El reloj arranca acá y no al terminar: así el intervalo es entre
    # análisis y no entre análisis y el final del anterior.
    _last_photo_analysis = time.monotonic()

    try:
        imagen = api_client.download_photo(photo)
        resultado = vision.analyze(imagen)
    except Exception as e:  # noqa: BLE001 - red, SDK o JSON inválido
        print(f"  !! falló el análisis de {photo_id}: {e}")
        _descartar(photo_id, f"{type(e).__name__}: {e}", "failed")
        return

    if resultado is None:
        print(f"  ↷ Claude no analizó la foto {photo_id} (refusal)")
        _descartar(photo_id, "Claude no analizó la imagen (refusal)", "skipped")
        return

    if not resultado["analizable"]:
        print(f"  ↷ foto {photo_id} no analizable: {resultado['motivo']}")
        _descartar(photo_id, resultado["motivo"], "skipped")
        return

    resultado.pop("analizable")
    try:
        api_client.submit_analysis(photo_id, resultado)
        problemas = len(resultado["issues"])
        print(f"  ✓ salud {resultado['healthScore']}% · {resultado['growthStage']}"
              + (f" · {problemas} problema(s)" if problemas else ""))
    except Exception as e:  # noqa: BLE001
        print(f"  !! no se pudo guardar el análisis de {photo_id}: {e}")
        _descartar(photo_id, f"No se pudo guardar: {e}", "failed")


def _descartar(photo_id: str, motivo: str, status: str) -> None:
    """Deja la foto fuera de la cola. Si esto falla, el plazo de stale la rescata."""
    try:
        api_client.discard_analysis(photo_id, motivo, status)
    except Exception as e:  # noqa: BLE001
        print(f"  !! no se pudo marcar {photo_id} como {status}: {e}")


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

    # Análisis de fotos. Va al final y con su propio try: que falle mirando una
    # foto no debería tapar las alertas de los sensores, que son lo urgente.
    try:
        _process_photos()
    except Exception as e:  # noqa: BLE001
        print(f"  (error en el análisis de fotos: {e})")


def main() -> None:
    print(f"🧠 Mallki Sapan AI-engine → {config.BACKEND_URL} (cada {config.POLL_INTERVAL_SEC}s)")
    print(f"   Claude: {'activo (' + config.CLAUDE_MODEL + ')' if config.ANTHROPIC_API_KEY else 'fallback por reglas'}")
    if config.PHOTO_ANALYSIS_ENABLED and config.ANTHROPIC_API_KEY:
        # max(1) para que un intervalo en 0 ("analizá siempre que puedas") no
        # tire el motor al arrancar por una división por cero.
        cada = max(config.PHOTO_ANALYSIS_INTERVAL_SEC, 1)
        print(f"   Fotos: una cada {cada}s (~{round(86400 / cada)} análisis por día)")
    while True:
        try:
            tick()
        except Exception:  # noqa: BLE001 - el loop nunca debe morir por un error puntual
            print("Error en el ciclo de análisis:")
            traceback.print_exc()
        time.sleep(config.POLL_INTERVAL_SEC)


if __name__ == "__main__":
    main()
