'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { crops } from '@/lib/mock-data';
import { formatDate, getStageLabel, getHealthColor, cn } from '@/lib/utils';
import {
  Leaf,
  Calendar,
  MapPin,
  TrendingUp,
  Droplets,
  Sun,
  ChevronRight,
} from 'lucide-react';

const stageColors: Record<string, string> = {
  germination: 'bg-purple-100 text-purple-700',
  seedling: 'bg-pink-100 text-pink-700',
  vegetative: 'bg-green-100 text-green-700',
  flowering: 'bg-yellow-100 text-yellow-700',
  fruiting: 'bg-orange-100 text-orange-700',
  harvest: 'bg-red-100 text-red-700',
};

const stageProgress: Record<string, number> = {
  germination: 10,
  seedling: 25,
  vegetative: 50,
  flowering: 70,
  fruiting: 85,
  harvest: 100,
};

export default function CultivosPage() {
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const activeCrop = selectedCrop ? crops.find(c => c.id === selectedCrop) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cultivos</h1>
          <p className="text-gray-500">Gestiona y monitorea tus cultivos</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-white font-medium hover:bg-green-600 transition-colors">
          <Leaf className="h-4 w-4" />
          Agregar Cultivo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crops list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Cultivos ({crops.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {crops.map((crop) => (
                  <div
                    key={crop.id}
                    onClick={() => setSelectedCrop(crop.id)}
                    className={cn(
                      'flex items-center gap-4 px-6 py-4 cursor-pointer transition-all',
                      selectedCrop === crop.id
                        ? 'bg-green-50 border-l-4 border-green-500'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    {/* Crop icon */}
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex-shrink-0">
                      <Leaf className="h-7 w-7 text-green-600" />
                    </div>

                    {/* Crop info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900">{crop.name}</h4>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          stageColors[crop.currentStage]
                        )}>
                          {getStageLabel(crop.currentStage)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{crop.variety}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="h-3 w-3" />
                          {crop.location}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="h-3 w-3" />
                          Cosecha: {formatDate(crop.expectedHarvestDate)}
                        </span>
                      </div>
                    </div>

                    {/* Health score */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              crop.healthScore >= 90 ? 'bg-green-500' :
                              crop.healthScore >= 75 ? 'bg-yellow-500' :
                              crop.healthScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
                            )}
                            style={{ width: `${crop.healthScore}%` }}
                          />
                        </div>
                        <span className={cn('text-lg font-bold', getHealthColor(crop.healthScore))}>
                          {crop.healthScore}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Salud</p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Crop details */}
        <div>
          {activeCrop ? (
            <Card>
              <CardHeader className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
                    <Leaf className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-white">{activeCrop.name}</CardTitle>
                    <p className="text-green-100 text-sm">{activeCrop.variety}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Health score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Salud del cultivo</span>
                    <span className={cn('text-lg font-bold', getHealthColor(activeCrop.healthScore))}>
                      {activeCrop.healthScore}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        activeCrop.healthScore >= 90 ? 'bg-green-500' :
                        activeCrop.healthScore >= 75 ? 'bg-yellow-500' :
                        activeCrop.healthScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
                      )}
                      style={{ width: `${activeCrop.healthScore}%` }}
                    />
                  </div>
                </div>

                {/* Growth progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progreso de crecimiento</span>
                    <span className="text-sm text-gray-500">
                      {stageProgress[activeCrop.currentStage]}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${stageProgress[activeCrop.currentStage]}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-400">Siembra</span>
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded',
                      stageColors[activeCrop.currentStage]
                    )}>
                      {getStageLabel(activeCrop.currentStage)}
                    </span>
                    <span className="text-xs text-gray-400">Cosecha</span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Ubicación</p>
                      <p className="text-sm font-medium text-gray-900">{activeCrop.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Fecha de siembra</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(activeCrop.plantedDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-xs text-gray-500">Cosecha estimada</p>
                      <p className="text-sm font-medium text-green-700">{formatDate(activeCrop.expectedHarvestDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 text-center">
                    <Droplets className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-blue-700">65%</p>
                    <p className="text-xs text-blue-600">Humedad</p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-50 text-center">
                    <Sun className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-yellow-700">850</p>
                    <p className="text-xs text-yellow-600">Lux</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 rounded-lg bg-green-500 px-4 py-2 text-white text-sm font-medium hover:bg-green-600 transition-colors">
                    Ver Fotos
                  </button>
                  <button className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                    Historial
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Leaf className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Selecciona un cultivo para ver sus detalles</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
