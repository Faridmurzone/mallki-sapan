// Copiá este archivo como `secrets.h` y completá con tus valores.
// `secrets.h` está en .gitignore: nunca se commitea.
#pragma once

// ---------------------------------------------------------------- WiFi
// La ESP32-CAM sólo habla 2.4 GHz. Si tu router publica una sola SSID para
// 2.4 y 5 GHz, puede que no conecte: separá las bandas o usá la de 2.4.
#define WIFI_SSID       "TU_RED_2.4GHZ"
#define WIFI_PASSWORD   "TU_PASSWORD"

// ---------------------------------------------------------------- Backend
// Sin barra final. En desarrollo, la IP de la máquina donde corre el backend
// (no "localhost": eso apuntaría a la propia ESP32).
#define BACKEND_BASE_URL "http://192.168.0.100:3001"

// Identificador estable de esta cámara. Minúsculas, números y guiones,
// entre 3 y 64 caracteres. Va en la URL y en el nombre del objeto guardado.
#define CAMERA_ID        "esp32-cam-01"
