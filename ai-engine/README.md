# AI Engine — Mallki Sapan

Motor de IA en Python que analiza los datos de los sensores, genera **alertas**
y (opcionalmente) decide **riego** por IA. Lee y escribe todo vía el API del
backend Express.

## Qué hace

Cada `POLL_INTERVAL_SEC` (60s por defecto):

1. Lee los sensores (`GET /api/sensors`).
2. Evalúa pH, temperatura del agua, nivel y EC contra los rangos hidropónicos
   (`src/analysis.py`) y crea alertas (`POST /api/alerts`) con cooldown para no
   spammear.
3. Detecta **caídas rápidas de nivel** del tanque (posible fuga).
4. Si `AI_IRRIGATION_ENABLED=1`, decide riego (`POST /api/irrigation/auto`),
   respetando el corte por nivel bajo del backend.
5. Analiza **una foto** de la cámara con Claude (visión), como mucho una cada
   `PHOTO_ANALYSIS_INTERVAL_SEC`.

Las recomendaciones de cada alerta las genera **Claude** si hay `ANTHROPIC_API_KEY`;
si no, usa un fallback por reglas (no requiere API key para funcionar).

## Análisis de fotos

La cámara sube una foto por minuto: **1440 por día**. Analizarlas todas sería
carísimo y además inútil, porque entre una foto y la siguiente la planta no
cambió. Por eso el motor pide **una sola foto por vez** al backend, que en la
misma transacción elige la más reciente y marca las pendientes más viejas como
`skipped`. Con el intervalo por defecto de una hora son ~24 análisis por día y
la cola nunca crece.

El ciclo de una foto:

```
claim (backend elige la más nueva y descarta las viejas)
  → descarga el JPEG
  → Claude con visión, salida estructurada
  → POST /api/photos/:id/analysis   (→ done, y una alerta por cada problema)
```

Si algo sale mal la foto no queda colgada:

| Situación | Estado final |
|-----------|--------------|
| Análisis exitoso | `done` |
| Foto de noche, movida o sin plantas | `skipped` (sin alertas) |
| Error de red, del SDK o JSON inválido | `failed`, con el motivo en `analysisError` |
| El worker se muere a mitad del análisis | vuelve a `pending` tras `PHOTO_ANALYSIS_STALE_SEC` |

**Sin `ANTHROPIC_API_KEY` el análisis de fotos no hace nada** y las fotos quedan
`pending`: no hay forma de mirar una imagen por reglas, y descartarlas sin
haberlas mirado sería peor que dejarlas esperando.

## Setup

```bash
cd ai-engine
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # editá BACKEND_URL y, si querés IA, ANTHROPIC_API_KEY
python -m src.main
```

## Configuración (`.env`)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:3001` | URL del backend Express |
| `POLL_INTERVAL_SEC` | `60` | Frecuencia de análisis |
| `ALERT_COOLDOWN_SEC` | `1800` | Anti-spam entre alertas del mismo tipo |
| `AI_IRRIGATION_ENABLED` | `0` | `1` para habilitar riego por IA |
| `ANTHROPIC_API_KEY` | — | Opcional; habilita recomendaciones y análisis de fotos |
| `CLAUDE_MODEL` | `claude-opus-5` | Modelo de Claude a usar |
| `PHOTO_ANALYSIS_ENABLED` | `1` | `0` para apagar el análisis de fotos |
| `PHOTO_ANALYSIS_INTERVAL_SEC` | `3600` | Cada cuánto se analiza una foto (perilla de costo) |
| `PHOTO_ANALYSIS_STALE_SEC` | `900` | Cuándo se recupera una foto que quedó a medio analizar |

## Estructura

```
ai-engine/
├── requirements.txt
├── .env.example
└── src/
    ├── config.py       # configuración desde .env
    ├── api_client.py   # cliente HTTP del backend
    ├── analysis.py     # rangos hidropónicos + reglas de decisión
    ├── advisor.py      # recomendación de una alerta (Claude o fallback)
    ├── vision.py       # análisis de una foto (Claude, sin fallback posible)
    └── main.py         # loop de polling
```

## Rangos hidropónicos (resumen)

| Parámetro | Óptimo | Crítico |
|-----------|--------|---------|
| pH | 5.5 – 6.5 | <5.0 o >8.0 |
| EC | 1.2 – 2.2 mS/cm | <0.8 o >2.8 |
| Temp. agua | 18 – 24 °C | <10 o >35 |
| Nivel tanque | > 30 % | < 15 % |

Editá `src/analysis.py` (`HYDRO_RANGES`) para ajustarlos a tu cultivo.
