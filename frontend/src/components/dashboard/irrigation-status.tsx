'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getIrrigationEvents } from '@/lib/api';
import { formatTime, cn } from '@/lib/utils';
import { Droplets, Clock, Zap, Hand, Loader2 } from 'lucide-react';
import type { IrrigationEvent } from '@/types';

const triggerIcons = {
  scheduled: Clock,
  ai_decision: Zap,
  manual: Hand,
};

const triggerLabels = {
  scheduled: 'Programado',
  ai_decision: 'IA',
  manual: 'Manual',
};

export function IrrigationStatus() {
  const [events, setEvents] = useState<IrrigationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getIrrigationEvents(7);
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos de riego');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Estado del Riego
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Estado del Riego
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-gray-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.timestamp.startsWith(today));
  const totalWaterToday = todayEvents.reduce((acc, e) => acc + e.waterVolume, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          Estado del Riego
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-600 font-medium">Agua usada hoy</p>
            <p className="text-2xl font-bold text-blue-700">{totalWaterToday}L</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-600 font-medium">Eventos hoy</p>
            <p className="text-2xl font-bold text-green-700">{todayEvents.length}</p>
          </div>
        </div>

        {/* Recent events */}
        <h4 className="text-sm font-medium text-gray-700 mb-3">Últimos riegos</h4>
        <div className="space-y-3">
          {events.slice(0, 4).map((event) => {
            const TriggerIcon = triggerIcons[event.trigger];
            return (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className={cn(
                  'rounded-full p-2',
                  event.trigger === 'ai_decision'
                    ? 'bg-purple-100'
                    : event.trigger === 'scheduled'
                    ? 'bg-blue-100'
                    : 'bg-gray-200'
                )}>
                  <TriggerIcon className={cn(
                    'h-4 w-4',
                    event.trigger === 'ai_decision'
                      ? 'text-purple-600'
                      : event.trigger === 'scheduled'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  )} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {event.zones.join(', ')}
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      event.trigger === 'ai_decision'
                        ? 'bg-purple-100 text-purple-700'
                        : event.trigger === 'scheduled'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-200 text-gray-700'
                    )}>
                      {triggerLabels[event.trigger]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatTime(event.timestamp)} - {event.duration} min - {event.waterVolume}L
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
