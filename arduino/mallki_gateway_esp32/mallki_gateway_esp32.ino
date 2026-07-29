/* ============================================================
 * Mallki Sapan — ESP32 Gateway (Opción B)
 * ------------------------------------------------------------
 * Recibe por Serial2 las líneas JSON del Arduino Uno
 *   {"ph":6.42,"water_temp":21.3,"level":78.5}
 * y las reenvía al backend como 3 POST /readings.
 *
 * Conexión: Uno TX(D3) --[divisor 1k/2k]--> ESP32 RX (GPIO16).
 * GND común entre Uno y ESP32.
 * Copiá ../config.example.h como config.h en ESTA carpeta.
 * ============================================================ */

#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"

#define RX_FROM_UNO 16   // Serial2 RX
#define TX_TO_UNO   17   // Serial2 TX (no se usa, pero se declara)

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000UL) delay(500);
}

bool postReading(const char *sensorId, float value) {
  if (isnan(value)) return false;
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) return false;

  String url = String(BACKEND_HOST) + "/api/sensors/" + sensorId + "/readings";
  String body = "{\"value\":" + String(value, 2) + "}";

  int backoff = 1000;
  for (int i = 0; i < 4; i++) {
    HTTPClient http;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    if (strlen(BACKEND_TOKEN) > 0)
      http.addHeader("Authorization", String("Bearer ") + BACKEND_TOKEN);
    int code = http.POST(body);
    http.end();
    if (code == 200 || code == 201) return true;
    delay(backoff); backoff *= 2;
  }
  return false;
}

// Extrae un número flotante por clave de un JSON plano {"k":v,...}.
float jsonNumber(const String &s, const char *key) {
  int k = s.indexOf(String("\"") + key + "\"");
  if (k < 0) return NAN;
  int colon = s.indexOf(':', k);
  if (colon < 0) return NAN;
  return s.substring(colon + 1).toFloat();
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RX_FROM_UNO, TX_TO_UNO);
  ensureWifi();
  Serial.println("Mallki Sapan — ESP32 gateway listo");
}

void loop() {
  if (Serial2.available()) {
    String line = Serial2.readStringUntil('\n');
    line.trim();
    if (line.length() < 5 || line[0] != '{') return;
    Serial.println("RX: " + line);

    float ph   = jsonNumber(line, "ph");
    float temp = jsonNumber(line, "water_temp");
    float lvl  = jsonNumber(line, "level");
    float ec   = jsonNumber(line, "ec");

    if (ph > 0 && ph < 14)       postReading(SENSOR_ID_PH, ph);
    if (temp > -50 && temp < 80) postReading(SENSOR_ID_TEMP, temp);
    if (lvl >= 0)                postReading(SENSOR_ID_LEVEL, lvl);
    if (ec >= 0 && ec < 10)      postReading(SENSOR_ID_EC, ec);
  }
}
