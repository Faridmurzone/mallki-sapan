'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Settings,
  Wifi,
  Bell,
  Cpu,
  Database,
  Shield,
  Palette,
  Globe,
  HardDrive,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';

const settingsSections = [
  {
    title: 'Dispositivos',
    icon: Cpu,
    items: [
      { name: 'Arduino Principal', status: 'connected', value: 'ESP32-WROOM' },
      { name: 'Sensor Hub', status: 'connected', value: '6 sensores activos' },
      { name: 'Cámara', status: 'connected', value: 'ESP32-CAM' },
    ],
  },
  {
    title: 'Conectividad',
    icon: Wifi,
    items: [
      { name: 'WiFi', status: 'connected', value: 'HuertaNet (192.168.1.50)' },
      { name: 'MQTT Broker', status: 'connected', value: 'mqtt://localhost:1883' },
      { name: 'API Backend', status: 'connected', value: 'http://localhost:3001' },
    ],
  },
  {
    title: 'Motor IA',
    icon: Database,
    items: [
      { name: 'Modelo de análisis', status: 'active', value: 'Claude 3.5 Sonnet' },
      { name: 'Base de conocimiento', status: 'active', value: '150 documentos' },
      { name: 'Última actualización', status: 'info', value: 'Hace 2 horas' },
    ],
  },
];

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500">Administra tu sistema Mallki Sapan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main settings */}
        <div className="lg:col-span-2 space-y-6">
          {settingsSections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="h-5 w-5" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.items.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        item.status === 'connected' || item.status === 'active'
                          ? 'bg-green-500'
                          : 'bg-gray-400'
                      }`} />
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Notifications settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Alertas críticas', description: 'Plagas, enfermedades, fallas del sistema', enabled: true },
                { name: 'Alertas de riego', description: 'Humedad baja, riegos completados', enabled: true },
                { name: 'Reportes diarios', description: 'Resumen del estado de la huerta', enabled: false },
                { name: 'Recomendaciones IA', description: 'Sugerencias de mejora', enabled: true },
              ].map((notification) => (
                <div
                  key={notification.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                >
                  <div>
                    <p className="font-medium text-gray-900">{notification.name}</p>
                    <p className="text-sm text-gray-500">{notification.description}</p>
                  </div>
                  <button
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      notification.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        notification.enabled ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          {/* System status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-green-600">Todo funcionando</p>
                <p className="text-sm text-gray-500">Última verificación: hace 5 min</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Uptime</span>
                  <span className="font-medium text-gray-900">15 días, 8 horas</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Uso de memoria</span>
                  <span className="font-medium text-gray-900">45%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Almacenamiento</span>
                  <span className="font-medium text-gray-900">2.3 GB / 16 GB</span>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
                <RefreshCw className="h-4 w-4" />
                Reiniciar sistema
              </button>
            </CardContent>
          </Card>

          {/* Quick settings */}
          <Card>
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Idioma</span>
                </div>
                <select className="text-sm border border-gray-200 rounded-lg px-2 py-1">
                  <option>Español</option>
                  <option>English</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Tema</span>
                </div>
                <select className="text-sm border border-gray-200 rounded-lg px-2 py-1">
                  <option>Claro</option>
                  <option>Oscuro</option>
                  <option>Sistema</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Auto-backup</span>
                </div>
                <button className="w-10 h-5 bg-green-500 rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 mb-3">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Mallki Sapan</h3>
              <p className="text-sm text-gray-500">Versión 0.1.0 (Beta)</p>
              <p className="text-xs text-gray-400 mt-2">
                Sistema inteligente de autogestión para huerta hortícola
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
