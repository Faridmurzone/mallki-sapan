'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { apiGet, apiPatch } from '@/lib/api';
import type { Camera as CamaraTipo } from '@/types';
import { formatDateTime, cn } from '@/lib/utils';
import { Camera, Pause, Play, Loader2, Check, Pencil } from 'lucide-react';

/**
 * Opciones de intervalo. El backend acepta cualquier valor entre 10 s y 24 h,
 * pero un desplegable evita el error de tipear 1 y saturar el disco.
 */
const INTERVALOS = [
  { sec: 30, label: '30 segundos' },
  { sec: 60, label: '1 minuto' },
  { sec: 300, label: '5 minutos' },
  { sec: 900, label: '15 minutos' },
  { sec: 1800, label: '30 minutos' },
  { sec: 3600, label: '1 hora' },
  { sec: 21600, label: '6 horas' },
  { sec: 86400, label: '1 día' },
];

/** ~Cuántas fotos por día genera un intervalo, para dimensionar el disco. */
function fotosPorDia(sec: number): string {
  const n = Math.round(86400 / sec);
  const mb = Math.round((n * 8) / 1024 * 10) / 10; // ~8 KB por foto en VGA
  return `≈ ${n.toLocaleString('es-AR')} fotos/día · ${mb} MB`;
}

export function CamerasPanel() {
  const [camaras, setCamaras] = useState<CamaraTipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);

  const [editandoNombre, setEditandoNombre] = useState<string | null>(null);
  const [nombreBuffer, setNombreBuffer] = useState('');

  const cargar = useCallback(async () => {
    try {
      setCamaras(await apiGet<CamaraTipo[]>('/api/cameras'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las cámaras');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 30_000);
    return () => clearInterval(id);
  }, [cargar]);

  async function actualizar(id: string, cambios: Record<string, unknown>) {
    setGuardando(id);
    setError(null);
    try {
      const actualizada = await apiPatch<CamaraTipo>(`/api/cameras/${id}`, cambios);
      // Sólo la fila que cambió: así un refresco de fondo no pisa lo que el
      // usuario está mirando.
      setCamaras(prev => prev.map(c => (c.id === id ? { ...c, ...actualizada } : c)));
      setEditandoNombre(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Cámaras
        </CardTitle>
        <p className="text-sm text-gray-500">
          Los cambios los toma la cámara en su próxima consulta, dentro de un minuto.
          No hace falta reprogramarla.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {cargando && <p className="py-6 text-center text-gray-500">Cargando cámaras…</p>}

        {error && !cargando && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {!cargando && camaras.length === 0 && (
          <div className="py-8 text-center">
            <Camera className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No hay cámaras registradas.</p>
            <p className="mt-1 text-sm text-gray-400">
              Aparecen solas la primera vez que se conectan.
            </p>
          </div>
        )}

        {camaras.map(camara => (
          <div
            key={camara.id}
            className={cn(
              'rounded-xl border p-4 transition-colors',
              camara.isActive ? 'border-gray-200 bg-white' : 'border-amber-200 bg-amber-50'
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {editandoNombre === camara.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={nombreBuffer}
                      onChange={e => setNombreBuffer(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') actualizar(camara.id, { name: nombreBuffer.trim() });
                        if (e.key === 'Escape') setEditandoNombre(null);
                      }}
                      maxLength={80}
                      placeholder="Nombre de la cámara"
                      className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-green-500 focus:outline-none"
                    />
                    <button
                      onClick={() => actualizar(camara.id, { name: nombreBuffer.trim() })}
                      aria-label="Guardar nombre"
                      className="rounded-lg bg-green-500 p-1.5 text-white hover:bg-green-600"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setNombreBuffer(camara.name ?? '');
                      setEditandoNombre(camara.id);
                    }}
                    className="group flex items-center gap-2"
                  >
                    <span className="font-medium text-gray-900">
                      {camara.name ?? camara.id}
                    </span>
                    <Pencil className="h-3 w-3 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                )}

                <p className="mt-0.5 font-mono text-xs text-gray-400">{camara.id}</p>

                <p className="mt-1 text-xs text-gray-500">
                  {camara.photoCount != null && `${camara.photoCount} fotos · `}
                  {camara.lastSeenAt
                    ? `vista ${formatDateTime(camara.lastSeenAt)}`
                    : 'nunca se conectó'}
                </p>
              </div>

              <button
                onClick={() => actualizar(camara.id, { isActive: !camara.isActive })}
                disabled={guardando === camara.id}
                className={cn(
                  'flex flex-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50',
                  camara.isActive
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-green-500 text-white hover:bg-green-600'
                )}
              >
                {guardando === camara.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : camara.isActive ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {camara.isActive ? 'Pausar' : 'Reanudar'}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
              <label className="text-sm text-gray-600" htmlFor={`int-${camara.id}`}>
                Sacar una foto cada
              </label>
              <select
                id={`int-${camara.id}`}
                value={camara.captureIntervalSec}
                onChange={e =>
                  actualizar(camara.id, { captureIntervalSec: Number(e.target.value) })
                }
                disabled={guardando === camara.id}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-green-500 focus:outline-none disabled:opacity-50"
              >
                {/* Si el valor guardado no está entre las opciones, lo agregamos
                    para no cambiarlo sin querer al tocar cualquier otra cosa. */}
                {!INTERVALOS.some(i => i.sec === camara.captureIntervalSec) && (
                  <option value={camara.captureIntervalSec}>
                    {camara.captureIntervalSec} segundos
                  </option>
                )}
                {INTERVALOS.map(i => (
                  <option key={i.sec} value={i.sec}>
                    {i.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400">
                {fotosPorDia(camara.captureIntervalSec)}
              </span>
            </div>

            {!camara.isActive && (
              <p className="mt-2 text-xs text-amber-700">
                En pausa: la cámara sigue conectada y consultando, pero no saca fotos.
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
