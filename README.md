# Mallki Sapan

Sistema inteligente de autogestión para huerta hortícola.

> **Mallki Sapan** (Quechua): "Árbol único" o "Planta solitaria"

## Descripción

Mallki Sapan es un sistema integral para automatizar y monitorear una huerta hortícola, combinando hardware (Arduino), inteligencia artificial y una interfaz web moderna.

## Arquitectura

El sistema se compone de tres módulos principales:

```
┌─────────────────────────────────────────────────────────────────┐
│                        MALLKI SAPAN                              │
├─────────────────┬─────────────────────┬─────────────────────────┤
│    HARDWARE     │      AI ENGINE      │        FRONTEND         │
│    (Arduino)    │      (Python)       │        (Next.js)        │
├─────────────────┼─────────────────────┼─────────────────────────┤
│ • Sensores      │ • Análisis de datos │ • Dashboard             │
│ • Riego auto    │ • RAG horticultura  │ • Monitoreo cultivos    │
│ • Transmisión   │ • Visión (fotos)    │ • Alertas               │
│   de datos      │ • Detección plagas  │ • Galería de fotos      │
│ • Control       │ • Decisiones        │ • Históricos            │
│   actuadores    │   inteligentes      │ • Reportes              │
└─────────────────┴─────────────────────┴─────────────────────────┘
```

### 1. Hardware (Arduino)
- Sensores de humedad del suelo
- Sensores de temperatura y humedad ambiente
- Control de sistema de riego
- Cámara para captura de imágenes
- Transmisión de datos vía WiFi/LoRa

### 2. Motor de IA (Python)
- Procesamiento e interpretación de datos de sensores
- Sistema RAG con guías de horticultura
- Análisis multimodal de imágenes:
  - Detección de plagas y enfermedades
  - Evaluación del estado de las plantas
  - Seguimiento del crecimiento
- Toma de decisiones automatizada
- Generación de alertas inteligentes

### 3. Frontend (Next.js)
- Dashboard interactivo en tiempo real
- Monitoreo de cultivos y su crecimiento
- Visualización de métricas de sensores
- Sistema de alertas y notificaciones
- Galería de fotos con análisis IA
- Históricos y reportes

## Estructura del Proyecto

```
mallki-sapan/
├── arduino/          # Código del microcontrolador
├── ai-engine/        # Motor de IA en Python
├── frontend/         # Aplicación Next.js
└── docs/             # Documentación
```

## Tech Stack

| Módulo | Tecnologías |
|--------|-------------|
| Hardware | Arduino, ESP32, Sensores, Actuadores |
| AI Engine | Python, LangChain, OpenCV, Claude API |
| Frontend | Next.js, TypeScript, Tailwind CSS, Recharts |

## Estado del Desarrollo

- [x] Definición de arquitectura
- [x] Frontend con dashboard (nivel, EC, históricos en vivo, calibración, riego)
- [x] Motor de IA (alertas + decisión de riego) — ver [`ai-engine/`](ai-engine/)
- [x] Firmware Arduino de monitoreo (pH, temp agua, nivel, EC) — ver [`arduino/`](arduino/)
- [x] Documentación de hardware/circuitos — ver [`docs/`](docs/)
- [x] Riego automático (relé en firmware + scheduler en backend)
- [ ] Integración end-to-end en hardware real (en progreso)

## Puesta en marcha rápida

```bash
docker compose up --build                          # Postgres + backend + frontend + ai-engine
docker compose exec backend npm run db:seed:hidro  # datos de prueba (sensores + 24h + alertas)
```

Frontend en http://localhost:3000 · backend en http://localhost:3001. Guía completa
(y opción local sin Docker): [docs/puesta-en-marcha.md](docs/puesta-en-marcha.md).

## Documentación

- [Puesta en marcha end-to-end](docs/puesta-en-marcha.md) — Docker/local, datos de prueba y hardware real.
- [Circuitos y cableado](docs/hardware/circuitos.md) — pH, temperatura del agua, nivel y EC para hidroponía en tubos PVC.
- [Arquitectura y escalado](docs/arquitectura/arquitectura.md)
- [Especificación funcional](docs/funcional/especificacion-funcional.md)
- [Firmware (ESP32 / Arduino Uno)](arduino/)

## Autor

**Farid** - [@faridmurzone](https://github.com/faridmurzone)

## Licencia

MIT
