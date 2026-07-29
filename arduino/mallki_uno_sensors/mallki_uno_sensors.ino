/* ============================================================
 * Mallki Sapan — Arduino Uno lector de sensores (Opción B)
 * ------------------------------------------------------------
 * El Uno lee pH (5V, sin divisor), temp del agua (DS18B20) y
 * nivel (ultrasónico) y emite una línea JSON por Serial hacia
 * el ESP32 gateway, que la reenvía por WiFi al backend.
 *
 * Salida (por SoftwareSerial D3 -> RX ESP32, CON divisor 1k/2k):
 *   {"ph":6.42,"water_temp":21.3,"level":78.5}
 *
 * Librerías: OneWire, DallasTemperature, SoftwareSerial (incluida).
 * Copiá ../config.example.h como config.h en ESTA carpeta.
 * ============================================================ */

#include <OneWire.h>
#include <DallasTemperature.h>
#include <SoftwareSerial.h>
#include "config.h"

OneWire oneWire(UNO_PIN_DS18B20);
DallasTemperature ds18b20(&oneWire);
SoftwareSerial link(4, UNO_PIN_TX);  // RX(no usado)=4, TX=D3

int cmpFloat(const void *a, const void *b) {
  float fa = *(const float *)a, fb = *(const float *)b;
  return (fa > fb) - (fa < fb);
}
float readMedian(float (*readOnce)(), int n) {
  float buf[16];
  if (n > 16) n = 16;
  for (int i = 0; i < n; i++) { buf[i] = readOnce(); delay(20); }
  qsort(buf, n, sizeof(float), cmpFloat);
  return buf[n / 2];
}

float readPhVoltageOnce() {
  int raw = analogRead(UNO_PIN_PH_ADC);
  return (raw / 1023.0f) * 5.0f;      // Uno: 10 bits, 5V, sin divisor
}
float voltageToPh(float v) {
  float slope = (7.0f - 4.0f) / (PH_VOLTAGE_AT_7 - PH_VOLTAGE_AT_4);
  return slope * (v - PH_VOLTAGE_AT_7) + 7.0f;
}
float readWaterTemp() {
  ds18b20.requestTemperatures();
  return ds18b20.getTempCByIndex(0);
}
float readDistanceOnce() {
  digitalWrite(UNO_PIN_TRIG, LOW);  delayMicroseconds(3);
  digitalWrite(UNO_PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(UNO_PIN_TRIG, LOW);
  unsigned long dur = pulseIn(UNO_PIN_ECHO, HIGH, 30000UL);
  if (dur == 0) return LEVEL_MAX_CM + 1;
  return (dur * 0.0343f) / 2.0f;
}
float distanceToLevelPct(float d) {
  if (d > LEVEL_MAX_CM) return -1;
  float col = TANK_HEIGHT_CM - (d - SENSOR_OFFSET_CM);
  float pct = (col / TANK_HEIGHT_CM) * 100.0f;
  return pct < 0 ? 0 : (pct > 100 ? 100 : pct);
}

void setup() {
  Serial.begin(115200);   // monitor USB
  link.begin(9600);       // enlace al ESP32
  pinMode(UNO_PIN_TRIG, OUTPUT);
  pinMode(UNO_PIN_ECHO, INPUT);
  ds18b20.begin();
  Serial.println(F("Mallki Sapan — Uno lector de sensores"));
}

void loop() {
  float ph   = voltageToPh(readMedian(readPhVoltageOnce, 7));
  float temp = readWaterTemp();
  float lvl  = distanceToLevelPct(readMedian(readDistanceOnce, 5));

  // Línea JSON hacia el ESP32.
  String json = "{";
  json += "\"ph\":" + String(ph, 2) + ",";
  json += "\"water_temp\":" + String(temp, 1) + ",";
  json += "\"level\":" + String(lvl, 1) + "}";

  link.println(json);
  Serial.println(json);   // también al monitor para depurar

  delay(SEND_INTERVAL_MS);
}
