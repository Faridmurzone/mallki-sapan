'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { irrigationHistory, sensors } from '@/lib/mock-data';
import { formatDateTime, formatTime, cn } from '@/lib/utils';
import {
  Droplets,
  Clock,
  Zap,
  Hand,
  Calendar,
  TrendingDown,
  Gauge,
  Power,
  Settings,
} from 'lucide-react';

const triggerIcons = {
  scheduled: Clock,
  ai_decision: Zap,
  manual: Hand,
};

const triggerLabels = {
  scheduled: 'Programado',
  ai_decision: 'Decisión IA',
  manual: 'Manual',
};

const triggerColors = {
  scheduled: 'bg-blue-100 text-blue-700',
  ai_decision: 'bg-purple-100 text-purple-700',
  manual: 'bg-gray-100 text-gray-700',
};

const zones = [
  { id: 'zona-a', name: 'Zona A', humidity: 65, status: 'normal', lastIrrigation: '06:00' },
  { id: 'zona-b', name: 'Zona B', humidity: 42, status: 'low', lastIrrigation: '07:30' },
];

export default function RiegoPage() {
  const todayEvents = irrigationHistory.filter(e => e.timestamp.startsWith('2025-01-14'));
  const totalWaterToday = todayEvents.reduce((acc, e) => acc + e.waterVolume, 0);
  const totalWaterWeek = irrigationHistory.reduce((acc, e) => acc + e.waterVolume, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Riego</h1>
          <p className="text-gray-500">Controla y monitorea el riego de tu huerta</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            <Settings className="h-4 w-4" />
            Programar
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white font-medium hover:bg-blue-600 transition-colors">
            <Droplets className="h-4 w-4" />
            Riego Manual
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <Droplets className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Agua hoy</p>
              <p className="text-2xl font-bold text-gray-900">{totalWaterToday}L</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Agua esta semana</p>
              <p className="text-2xl font-bold text-gray-900">{totalWaterWeek}L</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-3">
              <TrendingDown className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">vs semana anterior</p>
              <p className="text-2xl font-bold text-green-600">-12%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Riegos IA hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {todayEvents.filter(e => e.trigger === 'ai_decision').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zones */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Zonas de Riego</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all',
                    zone.status === 'low'
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-100 bg-white'
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'rounded-lg p-2',
                        zone.status === 'low' ? 'bg-yellow-200' : 'bg-blue-100'
                      )}>
                        <Droplets className={cn(
                          'h-5 w-5',
                          zone.status === 'low' ? 'text-yellow-700' : 'text-blue-600'
                        )} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{zone.name}</h3>
                        <p className="text-sm text-gray-500">Último riego: {zone.lastIrrigation}</p>
                      </div>
                    </div>
                    <button className={cn(
                      'flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors',
                      zone.status === 'low'
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    )}>
                      <Power className="h-4 w-4" />
                      {zone.status === 'low' ? 'Regar ahora' : 'Activar'}
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Humedad del suelo</span>
                      <span className={cn(
                        'text-sm font-bold',
                        zone.humidity >= 60 ? 'text-green-600' :
                        zone.humidity >= 40 ? 'text-yellow-600' : 'text-red-600'
                      )}>
                        {zone.humidity}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          zone.humidity >= 60 ? 'bg-green-500' :
                          zone.humidity >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${zone.humidity}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400">Seco</span>
                      <span className="text-xs text-gray-400">Óptimo</span>
                      <span className="text-xs text-gray-400">Húmedo</span>
                    </div>
                  </div>

                  {zone.status === 'low' && (
                    <div className="mt-3 p-2 rounded-lg bg-yellow-100 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">
                        IA recomienda riego en las próximas 2 horas
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Irrigation history */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Riegos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {irrigationHistory.map((event) => {
                  const TriggerIcon = triggerIcons[event.trigger];
                  return (
                    <div key={event.id} className="px-6 py-4 flex items-center gap-4">
                      <div className={cn(
                        'rounded-full p-2',
                        triggerColors[event.trigger].replace('text-', 'bg-').split(' ')[0]
                      )}>
                        <TriggerIcon className={cn(
                          'h-4 w-4',
                          event.trigger === 'ai_decision' ? 'text-purple-600' :
                          event.trigger === 'scheduled' ? 'text-blue-600' : 'text-gray-600'
                        )} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {event.zones.join(', ')}
                          </span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded',
                            triggerColors[event.trigger]
                          )}>
                            {triggerLabels[event.trigger]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDateTime(event.timestamp)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{event.waterVolume}L</p>
                        <p className="text-sm text-gray-500">{event.duration} min</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schedule */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Programación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-800">Riego matutino</span>
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">Activo</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">06:00</p>
                <p className="text-sm text-blue-600 mt-1">Zona A • 20 min</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-800">Riego vespertino</span>
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">Activo</span>
                </div>
                <p className="text-2xl font-bold text-green-900">18:00</p>
                <p className="text-sm text-green-600 mt-1">Todas las zonas • 25 min</p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">Riego nocturno</span>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inactivo</span>
                </div>
                <p className="text-2xl font-bold text-gray-400">22:00</p>
                <p className="text-sm text-gray-500 mt-1">Zona B • 15 min</p>
              </div>

              <button className="w-full rounded-lg border border-dashed border-gray-300 py-3 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
                + Agregar programación
              </button>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-purple-700">Modo IA</span>
                  </div>
                  <div className="w-12 h-6 bg-purple-500 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  La IA ajustará automáticamente el riego basándose en los sensores y condiciones climáticas.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
