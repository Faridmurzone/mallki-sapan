# Firmware — Mallki Sapan

Código del microcontrolador para el nodo de monitoreo hidropónico (pH,
temperatura del agua y nivel del tanque).

## Sketches

| Carpeta | Placa | Rol |
|---------|-------|-----|
| `mallki_node_esp32/` | ESP32 | **Opción A (recomendada):** lee los 3 sensores y postea al backend por WiFi. |
| `mallki_uno_sensors/` | Arduino Uno | **Opción B:** lee los sensores (pH a 5V) y manda JSON por Serial. |
| `mallki_gateway_esp32/` | ESP32 | **Opción B:** recibe el Serial del Uno y reenvía por WiFi. |

Elegí **A** o **B** (no las dos). Detalle de cableado en
[`../docs/hardware/circuitos.md`](../docs/hardware/circuitos.md).

## Puesta en marcha (Arduino IDE)

1. Instalá el soporte de placas **ESP32** (Boards Manager → "esp32 by Espressif").
2. Instalá las librerías (Library Manager): **OneWire**, **DallasTemperature**.
3. Copiá la config y completá tus datos:
   ```bash
   cp config.example.h mallki_node_esp32/config.h    # Opción A
   # o, para Opción B:
   cp config.example.h mallki_uno_sensors/config.h
   cp config.example.h mallki_gateway_esp32/config.h
   ```
4. Creá los sensores en el backend y pegá sus `id` en `config.h`:
   ```bash
   curl -X POST http://TU_BACKEND:3001/api/sensors -H 'Content-Type: application/json' \
     -d '{"name":"pH Tubo 1","type":"ph","unit":"pH"}'
   curl -X POST http://TU_BACKEND:3001/api/sensors -H 'Content-Type: application/json' \
     -d '{"name":"Temp agua Tubo 1","type":"temperature","unit":"°C"}'
   curl -X POST http://TU_BACKEND:3001/api/sensors -H 'Content-Type: application/json' \
     -d '{"name":"Nivel tanque","type":"water_level","unit":"%"}'
   curl -X POST http://TU_BACKEND:3001/api/sensors -H 'Content-Type: application/json' \
     -d '{"name":"EC Tubo 1","type":"ec","unit":"mS/cm"}'
   # zona de riego (para el control de bomba):
   curl -X POST http://TU_BACKEND:3001/api/irrigation/zones -H 'Content-Type: application/json' \
     -d '{"name":"Tubo 1"}'
   ```
   > Los tipos `water_level` y `ec` requieren correr la migración del backend
   > (`pnpm db:push` tras actualizar `schema.prisma`). Ver
   > [docs/hardware/circuitos.md §8](../docs/hardware/circuitos.md#8-extensión-del-modelo-de-datos-para-escalar).
5. Abrí el `.ino`, elegí la placa correcta, compilá y subí.
6. Abrí el Monitor Serie (115200) y calibrá el pH (ver §3.2 de circuitos):
   anotá el voltaje en buffer 7.0 y 4.0 → cargalos en `config.h` → recompilá.

## Riego automático (nodo ESP32)

El sketch `mallki_node_esp32` controla la bomba por ciclos ON/OFF (config
`PUMP_ON_MS` / `PUMP_OFF_MS`) con **corte de seguridad**: no bombea si el nivel
del tanque cae por debajo de `MIN_TANK_LEVEL_PCT` (15% por defecto) ni si el pH
sale del rango seguro. Cada ciclo cumplido se registra en el backend vía
`POST /api/irrigation/auto`, que **vuelve a validar el nivel del lado del servidor**
(defensa en profundidad). También podés consultar `GET /api/irrigation/can-irrigate`.
Poné `IRRIGATION_ENABLED 0` en `config.h` si sólo querés monitorear.

## Notas importantes

- `config.h` está en `.gitignore`: **no subas WiFi ni tokens**.
- En **ESP32** el pH y el Echo del ultrasónico van con **divisor de tensión**
  (el ADC es de 3.3V). Ajustá `PH_DIVIDER_FACTOR` si cambiás el divisor.
- El pH depende de la temperatura → por eso también se mide la del agua.
- Filtrado por mediana ya incluido; si el pH titila, agregá un capacitor 100nF
  entre Po y GND y alejá el cable de la bomba/relé.
