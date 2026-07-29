import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { hydroSensors } from '@/lib/mock-data';
import { Sensor, SensorType } from '@/types';
import { FlaskConical, Thermometer, Waves, Zap, LucideIcon } from 'lucide-react';

type Meta = {
  icon: LucideIcon;
  optimal: string;
  color: string;   // color de acento del icono
  bg: string;
};

const META: Partial<Record<SensorType, Meta>> = {
  ph:          { icon: FlaskConical, optimal: 'Óptimo 5.5 – 6.5', color: 'text-purple-600', bg: 'bg-purple-50' },
  temperature: { icon: Thermometer,  optimal: 'Óptimo 18 – 24 °C', color: 'text-orange-600', bg: 'bg-orange-50' },
  water_level: { icon: Waves,        optimal: 'Mínimo 30 %',       color: 'text-blue-600',   bg: 'bg-blue-50' },
  ec:          { icon: Zap,          optimal: 'Óptimo 1.2 – 2.2 mS/cm', color: 'text-teal-600', bg: 'bg-teal-50' },
};

const STATUS_BADGE = {
  normal:   { variant: 'success' as const, label: 'Normal' },
  warning:  { variant: 'warning' as const, label: 'Atención' },
  critical: { variant: 'danger' as const,  label: 'Crítico' },
};

const BAR_COLOR = {
  normal: 'bg-green-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
};

function SensorTile({ sensor }: { sensor: Sensor }) {
  const meta = META[sensor.type] ?? META.ph!;
  const Icon = meta.icon;
  const badge = STATUS_BADGE[sensor.status];

  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2 ${meta.bg}`}>
          <Icon className={`h-5 w-5 ${meta.color}`} />
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <p className="mt-3 text-sm font-medium text-gray-500">{sensor.name}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">{sensor.value}</span>
        <span className="text-sm text-gray-500">{sensor.unit}</span>
      </div>

      {/* Barra de nivel solo para el tanque */}
      {sensor.type === 'water_level' && (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${BAR_COLOR[sensor.status]}`}
            style={{ width: `${Math.max(0, Math.min(100, sensor.value))}%` }}
          />
        </div>
      )}

      <p className="mt-2 text-xs text-gray-400">{meta.optimal}</p>
    </div>
  );
}

export function HydroponicsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-blue-600" />
          Solución nutritiva (hidroponía)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hydroSensors.map((s) => (
            <SensorTile key={s.id} sensor={s} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
