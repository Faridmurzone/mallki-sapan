'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPost } from '@/lib/api';
import { Droplets, Power, Square, Waves, Plus, AlertTriangle, WifiOff } from 'lucide-react';

type Zone = { id: string; name: string; isActive: boolean };
type CanIrrigate = { allowed: boolean; level: number | null; minLevel: number; reason: string };

type Conn = 'loading' | 'ok' | 'offline';
type Msg = { kind: 'ok' | 'blocked' | 'error'; text: string } | null;

export function PumpControl() {
  const [conn, setConn] = useState<Conn>('loading');
  const [status, setStatus] = useState<CanIrrigate | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState('');
  const [duration, setDuration] = useState('15');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [newZone, setNewZone] = useState('');

  const refreshStatus = useCallback(async () => {
    try {
      const s = await apiGet<CanIrrigate>('/api/irrigation/can-irrigate');
      setStatus(s);
      setConn('ok');
    } catch {
      setConn('offline');
    }
  }, []);

  const refreshZones = useCallback(async () => {
    try {
      const z = await apiGet<Zone[]>('/api/irrigation/zones');
      setZones(z);
      setZoneId((prev) => prev || z[0]?.id || '');
    } catch {
      /* offline: lo maneja refreshStatus */
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    refreshZones();
    const t = setInterval(refreshStatus, 15000); // nivel en vivo cada 15 s
    return () => clearInterval(t);
  }, [refreshStatus, refreshZones]);

  async function irrigate() {
    setBusy(true);
    setMsg(null);
    try {
      await apiPost('/api/irrigation/auto', {
        zoneIds: [zoneId],
        duration: parseFloat(duration) || 15,
        trigger: 'manual',
      });
      setMsg({ kind: 'ok', text: `Riego iniciado (${duration} min).` });
      refreshStatus();
    } catch (e) {
      const text = (e as Error).message;
      // El backend responde 409 cuando el tanque está por debajo del mínimo.
      const blocked = /nivel|409|bloqueado/i.test(text);
      setMsg({ kind: blocked ? 'blocked' : 'error', text });
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setMsg(null);
    try {
      await apiPost('/api/irrigation/stop', {});
      setMsg({ kind: 'ok', text: 'Riego detenido.' });
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function createZone() {
    if (!newZone.trim()) return;
    setBusy(true);
    try {
      await apiPost('/api/irrigation/zones', { name: newZone.trim() });
      setNewZone('');
      await refreshZones();
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const level = status?.level;
  const allowed = status?.allowed ?? false;
  const min = status?.minLevel ?? 15;
  const barColor =
    level == null ? 'bg-gray-300'
      : level < min ? 'bg-red-500'
      : level < 30 ? 'bg-yellow-500'
      : 'bg-blue-500';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Control de bomba (en vivo)
          </span>
          {conn === 'offline' && (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-gray-400">
              <WifiOff className="h-3.5 w-3.5" /> backend offline
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {conn === 'offline' ? (
          <p className="text-sm text-gray-500">
            No se pudo conectar al backend. Verificá que esté corriendo y la variable{' '}
            <code className="rounded bg-gray-100 px-1">NEXT_PUBLIC_API_URL</code>.
          </p>
        ) : (
          <>
            {/* Nivel del tanque */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Waves className="h-4 w-4 text-blue-500" /> Nivel del tanque
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums text-gray-900">
                    {level == null ? '—' : `${Math.round(level)}%`}
                  </span>
                  <Badge variant={allowed ? 'success' : 'danger'}>
                    {allowed ? 'Riego habilitado' : 'Bloqueado'}
                  </Badge>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${Math.max(0, Math.min(100, level ?? 0))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Mínimo para bombear: {min}%. La bomba no arranca por debajo (protección en seco).
              </p>
            </div>

            {/* Controles */}
            {zones.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4">
                <p className="mb-2 text-sm text-gray-600">No hay zonas de riego. Creá una:</p>
                <div className="flex gap-2">
                  <input
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    placeholder="Ej. Tubo 1"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={createZone}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" /> Crear
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 min-w-[140px]">
                  <span className="text-sm text-gray-600">Zona</span>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </label>
                <label className="w-28">
                  <span className="text-sm text-gray-600">Duración (min)</span>
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </label>
              </div>
            )}

            {zones.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={irrigate}
                  disabled={busy || !allowed || !zoneId}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  title={!allowed ? 'Nivel del tanque insuficiente' : undefined}
                >
                  <Power className="h-4 w-4" /> Regar ahora
                </button>
                <button
                  onClick={stop}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  <Square className="h-4 w-4" /> Detener
                </button>
              </div>
            )}

            {/* Mensajes */}
            {msg && (
              <div
                className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                  msg.kind === 'ok'
                    ? 'bg-green-50 text-green-700'
                    : msg.kind === 'blocked'
                    ? 'bg-yellow-50 text-yellow-800'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {msg.kind !== 'ok' && <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />}
                <span>{msg.text}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
