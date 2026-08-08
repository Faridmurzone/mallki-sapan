"""Genera una recomendación breve para una alerta.

Si hay ANTHROPIC_API_KEY, usa la API de Claude; si no, usa un fallback por reglas.
"""
from typing import Optional

from . import config

_FALLBACKS = {
    "nutrition": "Ajustá la solución: para pH usá pH- / pH+ en dosis chicas y remedí; "
                 "para EC agregá agua (bajar) o nutriente (subir). Recalibrá las sondas.",
    "irrigation": "Revisá el nivel del tanque y rellená si está bajo. Verificá que la bomba "
                  "no trabaje en seco.",
    "environmental": "Sombreá o ventilá el tanque para estabilizar la temperatura del agua; "
                     "el rango ideal es 18–24 °C.",
}


def _rule_based(alert: dict) -> str:
    return _FALLBACKS.get(alert.get("type"), "Revisá el parámetro y ajustá según el cultivo.")


def recommend(alert: dict) -> Optional[str]:
    """Devuelve un texto de recomendación (o None)."""
    if not config.ANTHROPIC_API_KEY:
        return _rule_based(alert)

    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
        prompt = (
            "Sos un asistente de una huerta hidropónica en tubos de PVC. "
            "En 1-2 frases, en español rioplatense y de forma accionable, recomendá qué hacer ante esta alerta. "
            f"Título: {alert['title']}. Detalle: {alert['message']}."
        )
        resp = client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        if resp.stop_reason == "refusal":
            return _rule_based(alert)
        text = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text")
        return text.strip() or _rule_based(alert)
    except Exception as e:  # noqa: BLE001 - fallback ante cualquier error de red/SDK
        print(f"  (advisor: fallback por error de Claude API: {e})")
        return _rule_based(alert)
