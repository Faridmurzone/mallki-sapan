'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Droplets,
  Camera,
  FileText,
  Settings,
  Play,
  Pause,
} from 'lucide-react';

const actions = [
  {
    name: 'Riego manual',
    description: 'Activar riego',
    icon: Droplets,
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    name: 'Capturar foto',
    description: 'Nueva imagen',
    icon: Camera,
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    name: 'Generar reporte',
    description: 'PDF semanal',
    icon: FileText,
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    name: 'Configurar',
    description: 'Ajustes',
    icon: Settings,
    color: 'bg-gray-500 hover:bg-gray-600',
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <button
              key={action.name}
              className={`${action.color} rounded-lg p-4 text-white transition-all hover:scale-[1.02] active:scale-[0.98]`}
            >
              <action.icon className="h-6 w-6 mb-2" />
              <p className="font-medium text-sm">{action.name}</p>
              <p className="text-xs opacity-80">{action.description}</p>
            </button>
          ))}
        </div>

        {/* System controls */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Control del Sistema</h4>
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3 text-green-700 font-medium hover:bg-green-100 transition-colors">
              <Play className="h-4 w-4" />
              Automático ON
            </button>
            <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors">
              <Pause className="h-4 w-4" />
              Pausar
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
