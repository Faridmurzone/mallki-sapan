# Documentación — Mallki Sapan

Documentación del sistema de monitoreo para huerta **hidropónica en tubos de PVC**
con Arduino Uno + ESP32.

## Índice

| Documento | Contenido |
|-----------|-----------|
| [hardware/circuitos.md](hardware/circuitos.md) | **Circuitos y cableado**: pH, temperatura del agua, nivel del tanque; pinouts, divisores, calibración, BOM y checklist de armado. |
| [arquitectura/arquitectura.md](arquitectura/arquitectura.md) | **Arquitectura y escalado**: flujo de datos, contrato de API, topología (HTTP → MQTT), modelo de datos para multi-nodo, confiabilidad. |
| [funcional/especificacion-funcional.md](funcional/especificacion-funcional.md) | **Especificación funcional**: parámetros y rangos, casos de uso, reglas de negocio, estados y criterios de aceptación del MVP. |

## Firmware

El código del microcontrolador está en [`../arduino/`](../arduino/) con tres
sketches (nodo ESP32 standalone, y el par Uno + gateway ESP32).

## Resumen de una línea

> Cada tubo/estación mide **pH, temperatura del agua y nivel del tanque** con un
> ESP32, que envía las lecturas al backend (`POST /api/sensors/:id/readings`); el
> dashboard las muestra y (a futuro) la IA decide riego y correcciones.

## Parámetros que se monitorean

| Parámetro | Sensor | Rango óptimo | Estado backend |
|-----------|--------|--------------|----------------|
| pH | PH-4502C + sonda | 5.5 – 6.5 | `ph` |
| Temp. del agua | DS18B20 sumergible | 18 – 24 °C | `temperature` |
| Nivel del tanque | Ultrasónico / flotador | > 30 % | `water_level` * |
| EC (nutrientes) | Sonda EC (recomendado) | 1.2 – 2.2 mS/cm | `ec` * |

\* Tipos nuevos a agregar al enum del backend — ver
[circuitos §8](hardware/circuitos.md#8-extensión-del-modelo-de-datos-para-escalar).
