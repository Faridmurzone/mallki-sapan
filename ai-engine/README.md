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

Las recomendaciones de cada alerta las genera **Claude** si hay `ANTHROPIC_API_KEY`;
si no, usa un fallback por reglas (no requiere API key para funcionar).

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
| `ANTHROPIC_API_KEY` | — | Opcional; habilita recomendaciones con Claude |
| `CLAUDE_MODEL` | `claude-opus-5` | Modelo de Claude a usar |

## Estructura

```
ai-engine/
├── requirements.txt
├── .env.example
└── src/
    ├── config.py       # configuración desde .env
    ├── api_client.py   # cliente HTTP del backend
    ├── analysis.py     # rangos hidropónicos + reglas de decisión
    ├── advisor.py      # recomendación (Claude o fallback)
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
