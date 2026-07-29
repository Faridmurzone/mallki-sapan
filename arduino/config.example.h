// ============================================================
// config.example.h  —  Mallki Sapan
// ------------------------------------------------------------
// Copiá este archivo como "config.h" DENTRO de la carpeta del
// sketch que vas a compilar y completá tus valores.
//   cp config.example.h mallki_node_esp32/config.h
// config.h está en .gitignore (no subas WiFi ni tokens).
// ============================================================
#pragma once

// ---------- WiFi ----------
#define WIFI_SSID       "TU_RED_WIFI"
#define WIFI_PASSWORD   "TU_PASSWORD"

// ---------- Backend ----------
// IP o dominio del backend Express (puerto 3001 por defecto).
#define BACKEND_HOST    "http://192.168.0.100:3001"
// Token por nodo (si activás auth en el backend). Vacío = sin auth.
#define BACKEND_TOKEN   ""

// IDs de los sensores creados en el backend (POST /api/sensors).
// Ver docs/arquitectura/arquitectura.md §2 para crearlos.
#define SENSOR_ID_PH        "PEGAR_ID_DEL_SENSOR_PH"
#define SENSOR_ID_TEMP      "PEGAR_ID_DEL_SENSOR_TEMP"
#define SENSOR_ID_LEVEL     "PEGAR_ID_DEL_SENSOR_NIVEL"
#define SENSOR_ID_EC        "PEGAR_ID_DEL_SENSOR_EC"

// ---------- Tiempos ----------
#define SAMPLE_INTERVAL_MS  10000UL   // cada cuánto se muestrea
#define SEND_INTERVAL_MS    60000UL   // cada cuánto se envía al backend
#define SAMPLES_PER_READING 7         // muestras para la mediana

// ---------- Calibración pH (2 puntos) ----------
// Voltajes leídos por el firmware con la sonda en buffer 7.0 y 4.0.
// Corré el sketch, mirá el Serial, anotá y cargá acá.
#define PH_VOLTAGE_AT_7     2.50f
#define PH_VOLTAGE_AT_4     3.04f
// Factor del divisor en Po (solo ESP32). Uno = 1.0 (sin divisor).
//   ESP32 con divisor 10k/20k -> 20/(10+20) = 0.667  => compensar /0.667
#define PH_DIVIDER_FACTOR   0.667f
// Referencia del ADC:  Uno = 5.0 ; ESP32 = 3.3
#define ADC_VREF            3.3f
// Resolución del ADC:  Uno = 1023 ; ESP32 = 4095
#define ADC_MAX             4095.0f

// ---------- Nivel (ultrasónico) ----------
// Geometría del tanque para pasar distancia -> % de nivel.
#define TANK_HEIGHT_CM      40.0f   // alto útil del agua (lleno)
#define SENSOR_OFFSET_CM    5.0f    // dist. sensor->agua con tanque lleno
#define LEVEL_MAX_CM        400.0f  // descarta ecos > este valor

// ---------- EC / nutrientes (sonda TDS analógica, ej. DFRobot Gravity) ----------
// Salida analógica 0..~2.3V -> no requiere divisor en ESP32.
#define EC_K_VALUE          1.0f    // constante de celda de la sonda (calibrar)
// Formula DFRobot TDS con compensacion de temperatura (ver firmware).

// ---------- Riego automático ----------
#define IRRIGATION_ENABLED     1        // 1 = riego automático activo
#define PUMP_ON_MS             300000UL // bomba encendida (5 min)
#define PUMP_OFF_MS            900000UL // bomba apagada (15 min) -> ciclo NFT
#define MIN_TANK_LEVEL_PCT     15.0f    // no bombear por debajo de esto (RN-01)
#define PH_SAFE_MIN            4.5f     // fuera de este rango, cortar por seguridad
#define PH_SAFE_MAX            8.5f
#define RELAY_ACTIVE_HIGH      1        // 1: IN=HIGH enciende; 0: modulo active-low
// ID de la zona de riego creada en el backend (POST /api/irrigation/zones).
#define IRRIGATION_ZONE_ID     "PEGAR_ID_DE_LA_ZONA"

// ---------- Pines ESP32 (Opción A) ----------
#define PIN_PH_ADC     34   // ADC1, input-only (con divisor)
#define PIN_EC_ADC     35   // ADC1, input-only (sin divisor)
#define PIN_DS18B20     4
#define PIN_TRIG        5
#define PIN_ECHO       18
#define PIN_RELAY      13   // relé bomba/valvula

// ---------- Pines Arduino Uno (Opción B) ----------
#define UNO_PIN_PH_ADC   A0
#define UNO_PIN_DS18B20   2
#define UNO_PIN_TRIG      5
#define UNO_PIN_ECHO      6
#define UNO_PIN_TX        3   // SoftwareSerial TX -> RX ESP32 (con divisor)
