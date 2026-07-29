/* ============================================================
 * Mallki Sapan — Nodo hidropónico ESP32 (Opción A, standalone)
 * ------------------------------------------------------------
 * Lee pH, temperatura del agua (DS18B20) y nivel del tanque
 * (ultrasónico), filtra por mediana y publica cada lectura al
 * backend via HTTP POST /api/sensors/:id/readings.
 *
 * Librerías (Library Manager):
 *   - OneWire
 *   - DallasTemperature
 * Placa: "ESP32 Dev Module".
 *
 * ANTES de compilar: copiá ../config.example.h como config.h
 * en ESTA carpeta y completá tus valores.
 * ============================================================ */

#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "config.h"

OneWire oneWire(PIN_DS18B20);
DallasTemperature ds18b20(&oneWire);

unsigned long lastSample = 0;
unsigned long lastSend   = 0;

// Acumuladores para promediar entre envíos.
float phAccum = 0, tempAccum = 0, levelAccum = 0;
int   sampleCount = 0;

// ---------- Utilidades ----------
int cmpFloat(const void *a, const void *b) {
  float fa = *(const float *)a, fb = *(const float *)b;
  return (fa > fb) - (fa < fb);
}

// Mediana de N muestras de una función lectora.
float readMedian(float (*readOnce)(), int n) {
  float buf[16];
  if (n > 16) n = 16;
  for (int i = 0; i < n; i++) { buf[i] = readOnce(); delay(20); }
  qsort(buf, n, sizeof(float), cmpFloat);
  return buf[n / 2];
}

// ---------- Lecturas crudas ----------
float readPhVoltageOnce() {
  int raw = analogRead(PIN_PH_ADC);
  // Voltaje en el pin, corregido por el divisor de tensión.
  return (raw / ADC_MAX) * ADC_VREF / PH_DIVIDER_FACTOR;
}

float voltageToPh(float v) {
  // Recta de 2 puntos: pH = m*(v - v7) + 7
  float slope = (7.0f - 4.0f) / (PH_VOLTAGE_AT_7 - PH_VOLTAGE_AT_4);
  return slope * (v - PH_VOLTAGE_AT_7) + 7.0f;
}

float readWaterTemp() {
  ds18b20.requestTemperatures();
  float t = ds18b20.getTempCByIndex(0);
  return t;  // -127 si el sensor no responde
}

float readDistanceOnce() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(3);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long dur = pulseIn(PIN_ECHO, HIGH, 30000UL); // timeout 30ms (~5m)
  if (dur == 0) return LEVEL_MAX_CM + 1;                // sin eco
  return (dur * 0.0343f) / 2.0f;                        // cm
}

float distanceToLevelPct(float distCm) {
  if (distCm > LEVEL_MAX_CM) return -1;                 // inválido
  float waterCol = TANK_HEIGHT_CM - (distCm - SENSOR_OFFSET_CM);
  float pct = (waterCol / TANK_HEIGHT_CM) * 100.0f;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return pct;
}

// ---------- WiFi ----------
void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("WiFi conectando");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000UL) {
    delay(500); Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED
                 ? " OK " + WiFi.localIP().toString()
                 : " FALLO");
}

// POST con reintentos + backoff exponencial.
bool postReading(const char *sensorId, float value) {
  if (isnan(value) || value < -1000) return false;      // descarta basura
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) return false;

  String url = String(BACKEND_HOST) + "/api/sensors/" + sensorId + "/readings";
  String body = "{\"value\":" + String(value, 2) + "}";

  int backoff = 1000;
  for (int attempt = 0; attempt < 4; attempt++) {
    HTTPClient http;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    if (strlen(BACKEND_TOKEN) > 0)
      http.addHeader("Authorization", String("Bearer ") + BACKEND_TOKEN);
    int code = http.POST(body);
    http.end();
    if (code == 200 || code == 201) {
      Serial.printf("  -> %s = %.2f  (HTTP %d)\n", sensorId, value, code);
      return true;
    }
    Serial.printf("  !! POST %s HTTP %d (intento %d)\n", sensorId, code, attempt + 1);
    delay(backoff);
    backoff *= 2;
  }
  return false;
}

// ---------- Setup / Loop ----------
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\nMallki Sapan — nodo ESP32");

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_RELAY, LOW);

  analogReadResolution(12);          // 0..4095
  analogSetPinAttenuation(PIN_PH_ADC, ADC_11db); // rango ~0..3.3V

  ds18b20.begin();
  ensureWifi();
}

void loop() {
  unsigned long now = millis();

  // --- Muestreo ---
  if (now - lastSample >= SAMPLE_INTERVAL_MS) {
    lastSample = now;

    float phV  = readMedian(readPhVoltageOnce, SAMPLES_PER_READING);
    float ph   = voltageToPh(phV);
    float temp = readWaterTemp();
    float dist = readMedian(readDistanceOnce, 5);
    float lvl  = distanceToLevelPct(dist);

    Serial.printf("muestra: pH=%.2f (%.3fV) | agua=%.1fC | nivel=%.0f%% (%.1fcm)\n",
                  ph, phV, temp, lvl, dist);

    // Acumular solo valores válidos.
    if (ph > 0 && ph < 14)          { phAccum += ph; }
    if (temp > -50 && temp < 80)    { tempAccum += temp; }
    if (lvl >= 0)                   { levelAccum += lvl; }
    sampleCount++;
  }

  // --- Envío ---
  if (now - lastSend >= SEND_INTERVAL_MS && sampleCount > 0) {
    lastSend = now;
    postReading(SENSOR_ID_PH,    phAccum   / sampleCount);
    postReading(SENSOR_ID_TEMP,  tempAccum / sampleCount);
    postReading(SENSOR_ID_LEVEL, levelAccum / sampleCount);
    phAccum = tempAccum = levelAccum = 0;
    sampleCount = 0;
  }
}
