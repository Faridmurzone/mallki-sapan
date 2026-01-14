'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { alerts } from '@/lib/mock-data';
import { getRelativeTime, cn } from '@/lib/utils';
import {
  ArrowRight,
  Bug,
  Droplets,
  Thermometer,
  Leaf,
  FlaskConical,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

const typeIcons: Record<string, typeof Bug> = {
  pest: Bug,
  disease: AlertTriangle,
  irrigation: Droplets,
  nutrition: FlaskConical,
  environmental: Thermometer,
  growth: TrendingUp,
};

const severityStyles: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-50',
  high: 'border-l-orange-500 bg-orange-50',
  medium: 'border-l-yellow-500 bg-yellow-50',
  low: 'border-l-blue-500 bg-blue-50',
};

const severityBadge: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
};

export function AlertsPanel() {
  const recentAlerts = alerts.slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Alertas Recientes</CardTitle>
          {alerts.filter(a => !a.isRead).length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {alerts.filter(a => !a.isRead).length}
            </span>
          )}
        </div>
        <Link
          href="/alertas"
          className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
        >
          Ver todas
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {recentAlerts.map((alert) => {
            const Icon = typeIcons[alert.type] || AlertTriangle;
            return (
              <div
                key={alert.id}
                className={cn(
                  'px-6 py-4 border-l-4 transition-colors hover:bg-opacity-80',
                  severityStyles[alert.severity],
                  !alert.isRead && 'bg-opacity-100',
                  alert.isRead && 'bg-opacity-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 rounded-lg p-2',
                    alert.severity === 'critical' || alert.severity === 'high'
                      ? 'bg-white/80'
                      : 'bg-white/60'
                  )}>
                    <Icon className={cn(
                      'h-4 w-4',
                      alert.severity === 'critical' ? 'text-red-600' :
                      alert.severity === 'high' ? 'text-orange-600' :
                      alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={cn(
                        'font-medium text-gray-900',
                        !alert.isRead && 'font-semibold'
                      )}>
                        {alert.title}
                      </h4>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        severityBadge[alert.severity]
                      )}>
                        {alert.severity === 'critical' ? 'Crítico' :
                         alert.severity === 'high' ? 'Alto' :
                         alert.severity === 'medium' ? 'Medio' : 'Bajo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {alert.cropName && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Leaf className="h-3 w-3" />
                          {alert.cropName}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {getRelativeTime(alert.timestamp)}
                      </span>
                    </div>
                  </div>
                  {!alert.isRead && (
                    <div className="h-2 w-2 rounded-full bg-red-500 mt-2" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
