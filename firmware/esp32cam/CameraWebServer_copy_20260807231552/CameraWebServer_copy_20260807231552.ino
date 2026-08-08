#include <Arduino.h>
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// ===========================
// Select camera model in board_config.h
// ===========================
#include "board_config.h"

// ===========================
// Configuration
// ===========================
// Credenciales y endpoint viven en secrets.h, que está en .gitignore.
// Copiá secrets.example.h como secrets.h y completalo.
#include "secrets.h"

const char *ssid = WIFI_SSID;
const char *password = WIFI_PASSWORD;
const char *cameraId = CAMERA_ID;

const unsigned long photoIntervalMs = 60000;  // 1 minuto

// Reintentos: sólo ante timeout o 5xx. Un 4xx significa que el pedido está
// mal formado y reintentarlo igual no lo va a arreglar.
const int maxSendAttempts = 3;
const unsigned long retryBaseDelayMs = 2000;
const uint16_t httpTimeoutMs = 15000;

void startCameraServer();
void setupLedFlash();
void sendPhoto();
bool postJpeg(camera_fb_t *fb, const char *capturedAt, int &statusCode);
bool isoTimestamp(char *out, size_t outSize);

unsigned long lastPhotoSentAt = 0;

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

  Serial.printf("PSRAM: %s\n", psramFound() ? "YES" : "NO");

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_VGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  if (config.pixel_format == PIXFORMAT_JPEG) {
    if (psramFound()) {
      Serial.println("PSRAM found");

      config.jpeg_quality = 15;
      config.fb_count = 1;
      config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
    } else {
      config.frame_size = FRAMESIZE_QVGA;
      config.fb_location = CAMERA_FB_IN_DRAM;
      config.fb_count = 1;
      config.jpeg_quality = 20;
    }
  } else {
    config.frame_size = FRAMESIZE_240X240;

#if CONFIG_IDF_TARGET_ESP32S3
    config.fb_count = 2;
#endif
  }

#if defined(CAMERA_MODEL_ESP_EYE)
  pinMode(13, INPUT_PULLUP);
  pinMode(14, INPUT_PULLUP);
#endif

  // ===========================
  // Camera init
  // ===========================
  esp_err_t err = esp_camera_init(&config);

  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return;
  }

  sensor_t *s = esp_camera_sensor_get();

  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_brightness(s, 1);
    s->set_saturation(s, -2);
  }

  if (config.pixel_format == PIXFORMAT_JPEG) {
    s->set_framesize(s, FRAMESIZE_VGA);
  }

#if defined(CAMERA_MODEL_M5STACK_WIDE) || defined(CAMERA_MODEL_M5STACK_ESP32CAM)
  s->set_vflip(s, 1);
  s->set_hmirror(s, 1);
#endif

#if defined(CAMERA_MODEL_ESP32S3_EYE)
  s->set_vflip(s, 1);
#endif

#if defined(LED_GPIO_NUM)
  setupLedFlash();
#endif

  // ===========================
  // WiFi
  // ===========================
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);

  Serial.print("WiFi connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected");

  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Reloj por NTP: lo necesitamos para el header X-Captured-At.
  // Si no sincroniza, mandamos igual sin ese header y el backend usa la hora
  // de recepción. Perder la hora exacta es mejor que perder la foto.
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  Serial.print("Sincronizando reloj");
  struct tm timeinfo;
  for (int i = 0; i < 20 && !getLocalTime(&timeinfo, 500); i++) {
    Serial.print(".");
  }
  Serial.println();

  if (getLocalTime(&timeinfo, 0)) {
    Serial.println("Reloj sincronizado (UTC)");
  } else {
    Serial.println("Sin NTP: las fotos van sin X-Captured-At");
  }

  // Seguimos manteniendo el CameraWebServer
  startCameraServer();

  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFi.localIP());
  Serial.println("' to connect");

  // Opcional: mandar una foto inmediatamente al arrancar
  sendPhoto();

  lastPhotoSentAt = millis();
}

void loop() {
  if (millis() - lastPhotoSentAt >= photoIntervalMs) {
    sendPhoto();
    lastPhotoSentAt = millis();
  }

  delay(100);
}

// Fecha ISO-8601 en UTC, como la espera el backend: 2026-08-07T23:15:00Z
// Devuelve false si el reloj todavía no sincronizó por NTP.
bool isoTimestamp(char *out, size_t outSize) {
  struct tm timeinfo;

  if (!getLocalTime(&timeinfo, 0)) {
    return false;
  }

  // Antes de sincronizar, el reloj arranca en 1970. Si el año es absurdo,
  // preferimos no mandar el header a mandar una fecha inventada.
  if (timeinfo.tm_year + 1900 < 2020) {
    return false;
  }

  return strftime(out, outSize, "%Y-%m-%dT%H:%M:%SZ", &timeinfo) > 0;
}

// Un intento de POST. Devuelve true si el backend aceptó la imagen.
// statusCode queda con el código HTTP, o negativo si falló la conexión.
bool postJpeg(camera_fb_t *fb, const char *capturedAt, int &statusCode) {
  WiFiClient client;
  HTTPClient http;

  char url[192];
  snprintf(url, sizeof(url), "%s/api/cameras/%s/images", BACKEND_BASE_URL, cameraId);

  if (!http.begin(client, url)) {
    Serial.println("HTTP begin failed");
    statusCode = -1;
    return false;
  }

  http.setTimeout(httpTimeoutMs);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("X-Camera-Id", cameraId);

  if (capturedAt != nullptr) {
    http.addHeader("X-Captured-At", capturedAt);
  }

  statusCode = http.POST(fb->buf, fb->len);

  if (statusCode > 0) {
    String body = http.getString();
    Serial.printf("  -> %d %s\n", statusCode, body.c_str());
  } else {
    Serial.printf("  -> fallo de conexión: %s\n",
                  http.errorToString(statusCode).c_str());
  }

  http.end();

  return statusCode >= 200 && statusCode < 300;
}

void sendPhoto() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No se puede enviar: WiFi desconectado");
    return;
  }

  Serial.println("Capturando foto...");

  camera_fb_t *fb = esp_camera_fb_get();

  if (!fb) {
    Serial.println("Fallo la captura");
    return;
  }

  Serial.printf("Foto capturada: %u bytes, %ux%u\n", fb->len, fb->width, fb->height);

  char capturedAt[32];
  const char *capturedAtPtr = isoTimestamp(capturedAt, sizeof(capturedAt))
                                ? capturedAt
                                : nullptr;

  // El mismo X-Captured-At en todos los reintentos: es la clave con la que el
  // backend deduplica, así un timeout que igual llegó no crea una foto repetida.
  for (int attempt = 1; attempt <= maxSendAttempts; attempt++) {
    Serial.printf("POST intento %d/%d\n", attempt, maxSendAttempts);

    int statusCode = 0;

    if (postJpeg(fb, capturedAtPtr, statusCode)) {
      break;
    }

    // Un 4xx es culpa nuestra (imagen inválida, id mal formado, muy grande):
    // reintentar manda exactamente lo mismo y falla igual.
    if (statusCode >= 400 && statusCode < 500) {
      Serial.println("Error del pedido, no se reintenta");
      break;
    }

    if (attempt < maxSendAttempts) {
      unsigned long backoff = retryBaseDelayMs * (1UL << (attempt - 1));
      Serial.printf("Reintento en %lu ms\n", backoff);
      delay(backoff);
    }
  }

  // MUY importante: devolver el framebuffer a la cámara
  esp_camera_fb_return(fb);
}