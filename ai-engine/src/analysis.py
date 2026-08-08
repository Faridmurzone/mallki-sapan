"""Reglas de análisis: evalúa sensores y decide alertas / riego."""
from typing import Any, Optional

# Rangos objetivo para hidroponía. (optimo_min, optimo_max, critico_min, critico_max)
# Fuera de [optimo] -> warning; fuera de [critico] -> critical.
HYDRO_RANGES: dict[str, dict[str, Any]] = {
    "ph": {
        "optimo": (5.5, 6.5), "critico": (5.0, 8.0),
        "alert_type": "nutrition", "unidad": "pH", "label": "pH de la solución",
    },
    "ec": {
        "optimo": (1.2, 2.2), "critico": (0.8, 2.8),
        "alert_type": "nutrition", "unidad": "mS/cm", "label": "EC (nutrientes)",
    },
    "temperature": {
        "optimo": (18.0, 24.0), "critico": (10.0, 35.0),
        "alert_type": "environmental", "unidad": "°C", "label": "Temperatura del agua",
    },
    "water_level": {
        # el nivel solo tiene límite inferior útil
        "optimo": (30.0, 100.0), "critico": (15.0, 100.0),
        "alert_type": "irrigation", "unidad": "%", "label": "Nivel del tanque",
    },
}


def evaluate(sensor: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Devuelve una alerta (dict listo para POST) si el sensor está fuera de rango, o None."""
    rng = HYDRO_RANGES.get(sensor.get("type"))
    value = sensor.get("lastValue")
    if rng is None or value is None:
        return None

    o_min, o_max = rng["optimo"]
    c_min, c_max = rng["critico"]

    # Descartar lecturas físicamente imposibles (posible falla de sensor) — RN-02.
    if sensor["type"] == "ph" and not (0 <= value <= 14):
        return _alert(sensor, rng, "high",
                      f"Lectura de pH fuera de escala ({value}). Posible falla del sensor.")

    if value < c_min or value > c_max:
        sev = "critical"
    elif value < o_min or value > o_max:
        sev = "medium"
    else:
        return None  # dentro de rango

    unidad = rng["unidad"]
    rango_txt = f"{o_min}–{o_max} {unidad}"
    msg = (f"{rng['label']} en {value} {unidad}, fuera del rango óptimo ({rango_txt}). "
           f"Estado: {'crítico' if sev == 'critical' else 'atención'}.")
    return _alert(sensor, rng, "critical" if sev == "critical" else "medium", msg)


def _alert(sensor: dict, rng: dict, severity: str, message: str) -> dict[str, Any]:
    return {
        "type": rng["alert_type"],
        "severity": severity,
        "title": f"{rng['label']}: {sensor.get('name', sensor['type'])}",
        "message": message,
        # clave de dedupe (no se envía al backend)
        "_key": f"{sensor['id']}:{severity}",
    }


def detect_rapid_drop(readings: list[dict[str, Any]]) -> Optional[str]:
    """Detecta caída rápida de nivel: si en las últimas lecturas bajó > 20 puntos."""
    if len(readings) < 2:
        return None
    values = [r["value"] for r in readings]
    drop = values[0] - values[-1]  # readings vienen ordenadas asc por timestamp
    if drop > 20:
        return f"El nivel del tanque cayó {drop:.0f}% en el período. Revisar fuga o consumo alto."
    return None


def should_irrigate(sensors_by_type: dict[str, dict]) -> Optional[str]:
    """Decisión simple de riego por IA: temperatura del agua alta y nivel suficiente."""
    temp = sensors_by_type.get("temperature", {}).get("lastValue")
    level = sensors_by_type.get("water_level", {}).get("lastValue")
    if temp is None:
        return None
    if temp > 26 and (level is None or level >= 30):
        return f"Temperatura del agua alta ({temp}°C): un riego/recirculación ayuda a oxigenar y enfriar."
    return None
