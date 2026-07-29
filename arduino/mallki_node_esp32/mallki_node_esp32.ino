/* ============================================================
 * Mallki Sapan — Nodo hidropónico ESP32 (Opción A, standalone)
 * ------------------------------------------------------------
 * Lee pH, temperatura del agua (DS18B20), nivel del tanque
 * (ultrasónico) y EC/nutrientes (sonda TDS), filtra por mediana
 * y publica cada lectura al backend:
 *     POST /api/sensors/:id/readings
 *
 * Además controla la bomba de riego (relé) por ciclos con
 * cortes de seguridad: no bombea con el tanque por debajo de
 * MIN_TANK_LEVEL_PCT ni con el pH fuera de rango seguro (RN-01).
 *
 * Librerías (Library Manager): OneWire, DallasTemperature.
 * Placa: "ESP32 Dev Module".
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

// Prototipos (por si el auto-prototipado del IDE no los genera).
void postIrrigationEvent(float durationMin);
bool postReading(const char *sensorId, float value);
void fetchCalibration();

// Calibracion: arranca con los defaults de config.h y se sobrescribe con
// lo que haya en el backend (GET /api/calibration/:key) -> no hay que recompilar.
float g_phV7 = PH_VOLTAGE_AT_7;
float g_phV4 = PH_VOLTAGE_AT_4;
float g_ecK  = EC_K_VALUE;

unsigned long lastCalib = 0;
#define CALIB_INTERVAL_MS 1800000UL   // re-leer calibracion cada 30 min

unsigned long lastSample = 0;
unsigned long lastSend   = 0;
unsigned long pumpTimer  = 0;

// Acumuladores para promediar entre envíos.
float phAccum = 0, tempAccum = 0, levelAccum = 0, ecAccum = 0;
int   sampleCount = 0;

// Últimos valores válidos (para decisiones de seguridad del riego).
float lastPh = 7.0, lastTemp = 22.0, lastLevel = 100.0;
bool  pumpOn = false;

// ---------- Utilidades ----------
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

// ---------- Lecturas crudas ----------
float readPhVoltageOnce() {
  int raw = analogRead(PIN_PH_ADC);
  // Voltaje en el pin, corregido por el divisor de tensión.
  return (raw / ADC_MAX) * ADC_VREF / PH_DIVIDER_FACTOR;
}
float voltageToPh(float v) {
  // Recta de 2 puntos: pH = m*(v - v7) + 7  (usa la calibracion vigente)
  float slope = (7.0f - 4.0f) / (g_phV7 - g_phV4);
  return slope * (v - g_phV7) + 7.0f;
}

float readWaterTemp() {
  ds18b20.requestTemperatures();
  return ds18b20.getTempCByIndex(0);  // -127 si no responde
}

float readEcVoltageOnce() {
  int raw = analogRead(PIN_EC_ADC);
  return (raw / ADC_MAX) * ADC_VREF;   // sonda EC/TDS: sin divisor
}
// EC en mS/cm con compensación por temperatura (formula DFRobot TDS).
float voltageToEc(float v, float tempC) {
  float comp = 1.0f + 0.02f * (tempC - 25.0f);   // 2%/°C
  float vc = v / comp;
  float tdsPpm = (133.42f * vc * vc * vc - 255.86f * vc * vc + 857.39f * vc) * 0.5f;
  return (tdsPpm / 500.0f) * g_ecK;               // ppm -> mS/cm (K calibrable)
}

float readDistanceOnce() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(3);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long dur = pulseIn(PIN_ECHO, HIGH, 30000UL); // timeout ~5m
  if (dur == 0) return LEVEL_MAX_CM + 1;
  return (dur * 0.0343f) / 2.0f;                        // cm
}
float distanceToLevelPct(float distCm) {
  if (distCm > LEVEL_MAX_CM) return -1;
  float waterCol = TANK_HEIGHT_CM - (distCm - SENSOR_OFFSET_CM);
  float pct = (waterCol / TANK_HEIGHT_CM) * 100.0f;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return pct;
}

// ---------- Relé / bomba ----------
void pumpSet(bool on) {
  pumpOn = on;
#if RELAY_ACTIVE_HIGH
  digitalWrite(PIN_RELAY, on ? HIGH : LOW);
#else
  digitalWrite(PIN_RELAY, on ? LOW : HIGH);   // módulos active-low
#endif
}

// Máquina de estados de riego por ciclos con cortes de seguridad.
void irrigationControl() {
#if IRRIGATION_ENABLED
  unsigned long now = millis();

  // Corte de seguridad: nivel bajo o pH peligroso -> apagar y no reanudar.
  bool unsafe = (lastLevel < MIN_TANK_LEVEL_PCT) ||
                (lastPh < PH_SAFE_MIN || lastPh > PH_SAFE_MAX);
  if (unsafe) {
    if (pumpOn) {
      pumpSet(false);
      pumpTimer = now;
      Serial.printf("SEGURIDAD: bomba OFF (nivel=%.0f%% pH=%.2f)\n", lastLevel, lastPh);
    }
    return;
  }

  if (pumpOn && now - pumpTimer >= PUMP_ON_MS) {
    pumpSet(false); pumpTimer = now;
    Serial.println("Riego: bomba OFF (fin de ciclo)");
    postIrrigationEvent(PUMP_ON_MS / 60000.0f);   // registrar evento cumplido
  } else if (!pumpOn && now - pumpTimer >= PUMP_OFF_MS) {
    pumpSet(true); pumpTimer = now;
    Serial.println("Riego: bomba ON");
  }
#endif
}

// ---------- WiFi / HTTP ----------
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
                 ? " OK " + WiFi.localIP().toString() : " FALLO");
}

// Extrae un numero por clave de un JSON plano {"...":v,...}.
float jsonNumber(const String &s, const char *key) {
  int k = s.indexOf(String("\"") + key + "\"");
  if (k < 0) return NAN;
  int colon = s.indexOf(':', k);
  if (colon < 0) return NAN;
  return s.substring(colon + 1).toFloat();
}

// Lee la calibracion vigente del backend y sobrescribe los defaults.
void fetchCalibration() {
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) return;

  // pH: { params: { voltageAt7, voltageAt4 } }
  {
    HTTPClient http;
    http.begin(String(BACKEND_HOST) + "/api/calibration/ph");
    if (http.GET() == 200) {
      String b = http.getString();
      float v7 = jsonNumber(b, "voltageAt7");
      float v4 = jsonNumber(b, "voltageAt4");
      if (!isnan(v7) && !isnan(v4) && v7 != v4) {
        g_phV7 = v7; g_phV4 = v4;
        Serial.printf("calibracion pH: v7=%.3f v4=%.3f\n", v7, v4);
      }
    }
    http.end();
  }
  // EC: { params: { kValue } }
  {
    HTTPClient http;
    http.begin(String(BACKEND_HOST) + "/api/calibration/ec");
    if (http.GET() == 200) {
      String b = http.getString();
      float k = jsonNumber(b, "kValue");
      if (!isnan(k) && k > 0) { g_ecK = k; Serial.printf("calibracion EC: k=%.3f\n", k); }
    }
    http.end();
  }
}

bool postReading(const char *sensorId, float value) {
  if (isnan(value) || value < -1000) return false;
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
    delay(backoff); backoff *= 2;
  }
  return false;
}

// Registra el evento de riego cumplido en el backend (auditoría, RN-04).
void postIrrigationEvent(float durationMin) {
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String(BACKEND_HOST) + "/api/irrigation/auto";
  // zoneIds vacío -> el backend valida; ajustá con tu(s) zona(s) reales.
  String body = "{\"zoneIds\":[\"" IRRIGATION_ZONE_ID "\"],\"duration\":" +
                String(durationMin, 0) + ",\"trigger\":\"scheduled\"}";
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  if (strlen(BACKEND_TOKEN) > 0)
    http.addHeader("Authorization", String("Bearer ") + BACKEND_TOKEN);
  int code = http.POST(body);
  Serial.printf("  -> evento riego (HTTP %d)\n", code);
  http.end();
}

// ---------- Setup / Loop ----------
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\nMallki Sapan — nodo ESP32");

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_RELAY, OUTPUT);
  pumpSet(false);

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_PH_ADC, ADC_11db);
  analogSetPinAttenuation(PIN_EC_ADC, ADC_11db);

  ds18b20.begin();
  ensureWifi();
  fetchCalibration();          // lee la calibracion guardada desde la web
  lastCalib = millis();
  pumpTimer = millis();
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
    float ecV  = readMedian(readEcVoltageOnce, SAMPLES_PER_READING);
    float ec   = voltageToEc(ecV, (temp > -50 && temp < 80) ? temp : 25.0f);

    Serial.printf("pH=%.2f | agua=%.1fC | nivel=%.0f%% | EC=%.2fmS/cm\n",
                  ph, temp, lvl, ec);

    // Actualizar últimos válidos (para seguridad del riego).
    if (ph > 0 && ph < 14)       { lastPh = ph;    phAccum   += ph; }
    if (temp > -50 && temp < 80) { lastTemp = temp; tempAccum += temp; }
    if (lvl >= 0)                { lastLevel = lvl; levelAccum += lvl; }
    if (ec >= 0 && ec < 10)      { ecAccum   += ec; }
    sampleCount++;
  }

  // --- Re-leer calibración periódicamente (sin recompilar) ---
  if (now - lastCalib >= CALIB_INTERVAL_MS) {
    lastCalib = now;
    fetchCalibration();
  }

  // --- Control de riego (cada loop, es rápido) ---
  irrigationControl();

  // --- Envío ---
  if (now - lastSend >= SEND_INTERVAL_MS && sampleCount > 0) {
    lastSend = now;
    postReading(SENSOR_ID_PH,    phAccum   / sampleCount);
    postReading(SENSOR_ID_TEMP,  tempAccum / sampleCount);
    postReading(SENSOR_ID_LEVEL, levelAccum / sampleCount);
    postReading(SENSOR_ID_EC,    ecAccum   / sampleCount);
    phAccum = tempAccum = levelAccum = ecAccum = 0;
    sampleCount = 0;
  }
}
