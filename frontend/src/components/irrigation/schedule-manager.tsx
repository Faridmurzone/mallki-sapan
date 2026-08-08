'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Clock, Trash2, Plus, WifiOff } from 'lucide-react';

type Zone = { id: string; name: string };
type Schedule = {
  id: string; name: string; time: string; duration: number;
  days: number[]; zoneIds: string[]; enabled: boolean;
};

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function ScheduleManager() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [offline, setOffline] = useState(false);
  const [adding, setAdding] = useState(false);

  // form
  const [name, setName] = useState('');
  const [time, setTime] = useState('06:00');
  const [duration, setDuration] = useState('15');
  const [zoneId, setZoneId] = useState('');
  const [days, setDays] = useState<number[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, z] = await Promise.all([
        apiGet<Schedule[]>('/api/irrigation/schedules'),
        apiGet<Zone[]>('/api/irrigation/zones'),
      ]);
      setSchedules(s);
      setZones(z);
      setZoneId((p) => p || z[0]?.id || '');
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }

  async function add() {
    if (!name.trim() || !zoneId) return;
    try {
      await apiPost('/api/irrigation/schedules', {
        name: name.trim(), time, duration: parseInt(duration) || 15,
        days, zoneIds: [zoneId], enabled: true,
      });
      setName(''); setDays([]); setAdding(false);
      load();
    } catch { setOffline(true); }
  }

  async function toggleEnabled(s: Schedule) {
    try {
      await apiPut(`/api/irrigation/schedules/${s.id}`, { enabled: !s.enabled });
      load();
    } catch { setOffline(true); }
  }

  async function remove(id: string) {
    try {
      await apiDelete(`/api/irrigation/schedules/${id}`);
      load();
    } catch { setOffline(true); }
  }

  const zoneName = (ids: string[]) =>
    ids.map((id) => zones.find((z) => z.id === id)?.name ?? '¿?').join(', ');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2"><Clock className="h-5 w-5" /> Programación</span>
          {offline && (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-gray-400">
              <WifiOff className="h-3.5 w-3.5" /> offline
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {offline ? (
          <p className="text-sm text-gray-500">
            No se pudo conectar al backend. El riego programado corre en el servidor.
          </p>
        ) : (
          <>
            {schedules.length === 0 && (
              <p className="text-sm text-gray-500">Sin programaciones todavía.</p>
            )}

            {schedules.map((s) => (
              <div key={s.id} className={`rounded-xl border p-3 ${s.enabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{s.name}</span>
                      <span className="font-mono text-lg font-bold text-gray-900 tabular-nums">{s.time}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {zoneName(s.zoneIds)} · {s.duration} min ·{' '}
                      {s.days.length === 0 ? 'todos los días' : s.days.map((d) => DAY_LABELS[d]).join(' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleEnabled(s)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${s.enabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                      aria-label={s.enabled ? 'Desactivar' : 'Activar'}
                    >
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${s.enabled ? 'right-1' : 'left-1'}`} />
                    </button>
                    <button onClick={() => remove(s.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {adding ? (
              <div className="space-y-3 rounded-xl border border-gray-200 p-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (ej. Riego matutino)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <div className="flex gap-3">
                  <label className="flex-1">
                    <span className="text-xs text-gray-500">Hora</span>
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </label>
                  <label className="w-24">
                    <span className="text-xs text-gray-500">Min</span>
                    <input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs text-gray-500">Zona</span>
                  <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    {zones.length === 0 && <option value="">(creá una zona primero)</option>}
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </label>
                <div>
                  <span className="text-xs text-gray-500">Días (vacío = todos)</span>
                  <div className="mt-1 flex gap-1">
                    {DAY_LABELS.map((lbl, d) => (
                      <button key={d} onClick={() => toggleDay(d)} type="button"
                        className={`h-8 w-8 rounded-md text-xs font-medium ${days.includes(d) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={add} disabled={!name.trim() || !zoneId}
                    className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    Guardar
                  </button>
                  <button onClick={() => setAdding(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAdding(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500">
                <Plus className="h-4 w-4" /> Agregar programación
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
