"""Análisis de una foto de la huerta con Claude (visión).

A diferencia de `advisor.py`, acá no hay fallback por reglas: no se puede mirar
una foto sin un modelo. Sin ANTHROPIC_API_KEY este módulo no se usa.
"""
import base64
import json
from typing import Any, Optional

from . import config

# Estructura que devuelve el modelo. Sin `minimum`/`maximum`: los structured
# outputs no soportan restricciones numéricas, así que el rango de healthScore
# se recorta acá abajo.
ESQUEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "analizable": {
            "type": "boolean",
            "description": (
                "false si la foto no permite evaluar plantas: de noche, muy movida, "
                "fuera de foco, tapada o apuntando a otra cosa."
            ),
        },
        "motivo": {
            "type": "string",
            "description": "Si analizable es false, por qué. Si es true, string vacío.",
        },
        "healthScore": {
            "type": "integer",
            "description": "Salud general de las plantas de 0 a 100. 0 si no es analizable.",
        },
        "growthStage": {
            "type": "string",
            "description": (
                "Etapa de crecimiento en español, máximo 60 caracteres. "
                "Ej: 'Plántula tardía', 'Crecimiento vegetativo óptimo', 'Floración'."
            ),
        },
        "issues": {
            "type": "array",
            "items": {"type": "string"},
            "description": (
                "Problemas visibles y concretos (clorosis, manchas, plagas, marchitez). "
                "Vacío si no se ve ninguno. Cada issue genera una alerta: no inventes."
            ),
        },
        "recommendations": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Qué hacer, accionable y en español rioplatense.",
        },
    },
    "required": ["analizable", "motivo", "healthScore", "growthStage", "issues", "recommendations"],
    "additionalProperties": False,
}

PROMPT = """Estas mirando una foto de una huerta hidropónica casera en tubos de PVC.

La saca una ESP32-CAM: 640x480, sin buena óptica ni iluminación controlada. Muchas fotos van a salir oscuras, movidas o mal encuadradas, y eso es normal.

Evaluá el estado de las plantas que se vean. Sé conservador: cada problema que reportes genera una alerta para la persona que cuida la huerta, así que reportá sólo lo que se ve con claridad en esta imagen. Si la foto no da para evaluar nada, marcá analizable en false en vez de adivinar.

Escribí todo en español rioplatense."""


def analyze(image_bytes: bytes, media_type: str = "image/jpeg") -> Optional[dict[str, Any]]:
    """Analiza una foto.

    Devuelve un dict con:
      - `analizable=False` y `motivo` si la foto no sirve, o
      - `analizable=True` más los campos listos para POST /api/photos/:id/analysis.

    Devuelve None si el modelo se negó a responder (nada que reintentar).
    Cualquier error de red o de SDK se propaga para que el llamador lo marque
    como fallo y lo reintente más adelante.
    """
    from anthropic import Anthropic

    client = Anthropic(api_key=config.ANTHROPIC_API_KEY)

    resp = client.messages.create(
        model=config.CLAUDE_MODEL,
        # Con holgura: en Claude Opus 5 el pensamiento viene activado por
        # defecto y consume del mismo presupuesto que la respuesta.
        max_tokens=4000,
        output_config={
            "format": {"type": "json_schema", "schema": ESQUEMA},
            # Clasificar una foto no necesita razonamiento profundo.
            "effort": "low",
        },
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": base64.standard_b64encode(image_bytes).decode("ascii"),
                    },
                },
                {"type": "text", "text": PROMPT},
            ],
        }],
    )

    if resp.stop_reason == "refusal":
        return None

    # Por tipo de bloque y no por content[0]: con el pensamiento activado hay
    # un bloque de thinking antes del texto.
    texto = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()
    if not texto:
        raise ValueError(f"Claude no devolvió texto (stop_reason={resp.stop_reason})")

    return _normalizar(json.loads(texto))


def _normalizar(datos: dict[str, Any]) -> dict[str, Any]:
    """Ajusta lo que devolvió el modelo a lo que acepta el backend."""
    if not datos.get("analizable", True):
        return {"analizable": False, "motivo": (datos.get("motivo") or "Foto no analizable")[:500]}

    # healthScore: entero 0-100. La columna es Int y el esquema no puede
    # imponer el rango, así que se recorta acá.
    try:
        score = int(round(float(datos.get("healthScore", 0))))
    except (TypeError, ValueError):
        score = 0

    etapa = (datos.get("growthStage") or "").strip() or "Sin determinar"

    return {
        "analizable": True,
        "healthScore": max(0, min(100, score)),
        "growthStage": etapa[:80],  # el backend valida max(80)
        "issues": [str(i).strip() for i in datos.get("issues") or [] if str(i).strip()],
        "recommendations": [
            str(r).strip() for r in datos.get("recommendations") or [] if str(r).strip()
        ],
    }
