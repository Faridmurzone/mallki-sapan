'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getCrops } from '@/lib/api';
import { getStageLabel, getHealthColor, cn } from '@/lib/utils';
import { ArrowRight, Leaf, Loader2 } from 'lucide-react';
import type { Crop } from '@/types';

const stageColors: Record<string, string> = {
  germination: 'bg-purple-100 text-purple-700',
  seedling: 'bg-pink-100 text-pink-700',
  vegetative: 'bg-green-100 text-green-700',
  flowering: 'bg-yellow-100 text-yellow-700',
  fruiting: 'bg-orange-100 text-orange-700',
  harvest: 'bg-red-100 text-red-700',
};

export function CropsOverview() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getCrops();
        setCrops(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar cultivos');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cultivos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cultivos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-gray-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cultivos Activos</CardTitle>
        <Link
          href="/cultivos"
          className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
        >
          Ver todos
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {crops.slice(0, 5).map((crop) => (
            <div
              key={crop.id}
              className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-green-100 to-green-200">
                <Leaf className="h-6 w-6 text-green-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 truncate">{crop.name}</h4>
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    stageColors[crop.currentStage]
                  )}>
                    {getStageLabel(crop.currentStage)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{crop.location}</p>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
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
                  <span className={cn('text-sm font-semibold', getHealthColor(crop.healthScore))}>
                    {crop.healthScore}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Salud</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
