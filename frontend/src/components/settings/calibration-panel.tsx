'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { apiGet, apiPut } from '@/lib/api';
import { Calibration } from '@/types';
import { FlaskConical, Zap, Save, CheckCircle, AlertTriangle, Copy, Check } from 'lucide-react';

type SaveState = { kind: 'idle' | 'saving' | 'ok' | 'error'; msg?: string };

export function CalibrationPanel() {
  // pH: dos puntos (voltajes en buffer 7.0 y 4.0)
  const [v7, setV7] = useState('2.50');
  const [v4, setV4] = useState('3.04');
  // EC: constante de celda
  const [k, setK] = useState('1.00');

  const [phState, setPhState] = useState<SaveState>({ kind: 'idle' });
  const [ecState, setEcState] = useState<SaveState>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);

  // Prefill desde el backend (si está disponible).
  useEffect(() => {
    apiGet<Calibration>('/api/calibration/ph')
      .then((c) => {
        if (c.params.voltageAt7 != null) setV7(String(c.params.voltageAt7));
        if (c.params.voltageAt4 != null) setV4(String(c.params.voltageAt4));
      })
      .catch(() => { /* sin calibración previa: se usan los defaults */ });
    apiGet<Calibration>('/api/calibration/ec')
      .then((c) => { if (c.params.kValue != null) setK(String(c.params.kValue)); })
      .catch(() => {});
  }, []);

  const nv7 = parseFloat(v7);
  const nv4 = parseFloat(v4);
  const slope = nv7 !== nv4 ? 3 / (nv7 - nv4) : NaN; // pendiente pH/V (2 puntos)

  async function savePh() {
    setPhState({ kind: 'saving' });
    try {
      if (!isFinite(nv7) || !isFinite(nv4) || nv7 === nv4) {
        throw new Error('Voltajes inválidos (v7 debe ser distinto de v4)');
      }
      await apiPut('/api/calibration/ph', {
        params: { voltageAt7: nv7, voltageAt4: nv4 },
        note: `pendiente ${slope.toFixed(3)} pH/V`,
      });
      setPhState({ kind: 'ok', msg: 'Guardado' });
    } catch (e) {
      setPhState({ kind: 'error', msg: (e as Error).message });
    }
  }

  async function saveEc() {
    setEcState({ kind: 'saving' });
    try {
      const nk = parseFloat(k);
      if (!isFinite(nk) || nk <= 0) throw new Error('kValue debe ser > 0');
      await apiPut('/api/calibration/ec', { params: { kValue: nk } });
      setEcState({ kind: 'ok', msg: 'Guardado' });
    } catch (e) {
      setEcState({ kind: 'error', msg: (e as Error).message });
    }
  }

  const snippet =
    `#define PH_VOLTAGE_AT_7  ${isFinite(nv7) ? nv7.toFixed(2) : '2.50'}f\n` +
    `#define PH_VOLTAGE_AT_4  ${isFinite(nv4) ? nv4.toFixed(2) : '3.04'}f\n` +
    `#define EC_K_VALUE       ${parseFloat(k) > 0 ? parseFloat(k).toFixed(2) : '1.00'}f`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Calibración de sensores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* pH */}
        <div className="rounded-lg border border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-gray-900">pH — calibración de 2 puntos</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Voltaje en buffer 7.0 (V)" value={v7} onChange={setV7} />
            <Field label="Voltaje en buffer 4.0 (V)" value={v4} onChange={setV4} />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Pendiente calculada:{' '}
            <span className="font-mono font-semibold">
              {isFinite(slope) ? `${slope.toFixed(3)} pH/V` : '—'}
            </span>{' '}
            · Sumergí la sonda en cada buffer, leé el voltaje en el monitor serie y cargalo acá.
          </p>
          <SaveRow state={phState} onSave={savePh} />
        </div>

        {/* EC */}
        <div className="rounded-lg border border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-teal-600" />
            <span className="font-medium text-gray-900">EC — constante de celda</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="kValue" value={k} onChange={setK} />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Ajustá con solución patrón conocida (ej. 1.413 mS/cm) hasta que la lectura coincida.
          </p>
          <SaveRow state={ecState} onSave={saveEc} />
        </div>

        {/* Snippet para config.h */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Para el firmware (config.h)</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(snippet).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-md bg-gray-900 p-3 text-xs leading-relaxed text-gray-100">
            <code>{snippet}</code>
          </pre>
          <p className="mt-2 text-xs text-gray-400">
            El nodo ESP32 también lee esta calibración del backend al arrancar, así que
            normalmente no hace falta recompilar.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
      />
    </label>
  );
}

function SaveRow({ state, onSave }: { state: SaveState; onSave: () => void }) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        onClick={onSave}
        disabled={state.kind === 'saving'}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {state.kind === 'saving' ? 'Guardando…' : 'Guardar'}
      </button>
      {state.kind === 'ok' && (
        <span className="inline-flex items-center gap-1 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" /> {state.msg}
        </span>
      )}
      {state.kind === 'error' && (
        <span className="inline-flex items-center gap-1 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" /> {state.msg}
        </span>
      )}
    </div>
  );
}
