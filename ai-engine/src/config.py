"""Configuración del AI-engine (leída de .env / entorno)."""
import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001").rstrip("/")
POLL_INTERVAL_SEC = int(os.getenv("POLL_INTERVAL_SEC", "60"))
ALERT_COOLDOWN_SEC = int(os.getenv("ALERT_COOLDOWN_SEC", "1800"))
AI_IRRIGATION_ENABLED = os.getenv("AI_IRRIGATION_ENABLED", "0") == "1"

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-5")

# --- Análisis de fotos ---------------------------------------------------
# Sin ANTHROPIC_API_KEY esto no hace nada: no hay forma de mirar una foto por
# reglas, así que el motor deja las fotos pendientes en vez de descartarlas.
PHOTO_ANALYSIS_ENABLED = os.getenv("PHOTO_ANALYSIS_ENABLED", "1") == "1"

# Cada cuánto se analiza *una* foto. Es la perilla de costo: la cámara sube
# una foto por minuto (1440/día) y analizarlas todas sería carísimo e inútil,
# porque entre una y la siguiente la planta no cambió. Con el default de una
# hora son ~24 análisis por día; las intermedias quedan descartadas.
PHOTO_ANALYSIS_INTERVAL_SEC = int(os.getenv("PHOTO_ANALYSIS_INTERVAL_SEC", "3600"))

# Cuánto puede quedar una foto tomada por un worker antes de que otro la
# pueda volver a tomar (se murió a mitad del análisis).
PHOTO_ANALYSIS_STALE_SEC = int(os.getenv("PHOTO_ANALYSIS_STALE_SEC", "900"))
