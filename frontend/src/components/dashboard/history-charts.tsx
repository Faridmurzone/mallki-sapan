'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { apiGet } from '@/lib/api';
import { Sensor } from '@/types';
import { Activity, WifiOff } from 'lucide-react';

type Reading = { timestamp: string; value: number };
type Point = { time: string; value: number };

const fmt = (ts: string) =>
  new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

function useReadings(type: Sensor['type']) {
  const [data, setData] = useState<Point[] | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'empty' | 'offline'>('loading');
  const [unit, setUnit] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sensors = await apiGet<Sensor[]>('/api/sensors');
        const sensor = sensors.find((s) => s.type === type);
        if (!sensor) { if (alive) setState('empty'); return; }
        if (alive) setUnit(sensor.unit);
        const readings = await apiGet<Reading[]>(`/api/sensors/${sensor.id}/readings?hours=24`);
        if (!alive) return;
        if (readings.length === 0) { setState('empty'); return; }
        setData(readings.map((r) => ({ time: fmt(r.timestamp), value: Math.round(r.value * 100) / 100 })));
        setState('ok');
      } catch {
        if (alive) setState('offline');
      }
    })();
    return () => { alive = false; };
  }, [type]);

  return { data, state, unit };
}

function ChartCard({
  title, type, color, area,
}: { title: string; type: Sensor['type']; color: string; area?: boolean }) {
  const { data, state, unit } = useReadings(type);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color }} />
            {title}
          </span>
          {state === 'offline' && (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-gray-400">
              <WifiOff className="h-3.5 w-3.5" /> offline
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          {state === 'ok' && data ? (
            <ResponsiveContainer width="100%" height="100%">
              {area ? (
                <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id={`g-${type}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} width={40} unit={unit ? ` ${unit}` : ''} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" name={title} stroke={color} strokeWidth={2} fill={`url(#g-${type})`} />
                </AreaChart>
              ) : (
                <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} width={40} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" name={title} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
              {state === 'loading' && 'Cargando…'}
              {state === 'empty' && 'Sin lecturas todavía. El nodo empieza a enviar y aparecen acá.'}
              {state === 'offline' && 'Backend no disponible.'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function HistoryCharts() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard title="Nivel del tanque (24h)" type="water_level" color="#3b82f6" area />
      <ChartCard title="EC / nutrientes (24h)" type="ec" color="#0d9488" />
    </div>
  );
}
