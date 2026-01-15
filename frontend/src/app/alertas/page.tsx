'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAlerts, markAlertAsRead, markAllAlertsAsRead } from '@/lib/api';
import { getRelativeTime, formatDateTime, cn } from '@/lib/utils';
import type { Alert } from '@/types';
import {
  Bell,
  Bug,
  Droplets,
  Thermometer,
  Leaf,
  FlaskConical,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Filter,
  Sparkles,
  Loader2,
} from 'lucide-react';

const typeIcons: Record<string, typeof Bug> = {
  pest: Bug,
  disease: AlertTriangle,
  irrigation: Droplets,
  nutrition: FlaskConical,
  environmental: Thermometer,
  growth: TrendingUp,
};

const typeLabels: Record<string, string> = {
  pest: 'Plagas',
  disease: 'Enfermedades',
  irrigation: 'Riego',
  nutrition: 'Nutrición',
  environmental: 'Ambiente',
  growth: 'Crecimiento',
};

const severityStyles: Record<string, { border: string; bg: string; badge: string }> = {
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-700',
  },
  high: {
    border: 'border-l-orange-500',
    bg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
  },
  medium: {
    border: 'border-l-yellow-500',
    bg: 'bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  low: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
};

const severityLabels: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
};

type FilterType = 'all' | 'unread' | 'critical' | 'high' | 'medium' | 'low';

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAlerts();
        setAlerts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar alertas');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAlertsAsRead();
      setAlerts(alerts.map(a => ({ ...a, isRead: true })));
    } catch (err) {
      console.error('Error marking alerts as read:', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAlertAsRead(id);
      setAlerts(alerts.map(a => a.id === id ? { ...a, isRead: true } : a));
    } catch (err) {
      console.error('Error marking alert as read:', err);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alert.isRead;
    return alert.severity === filter;
  });

  const activeAlert = selectedAlert ? alerts.find(a => a.id === selectedAlert) : null;
  const unreadCount = alerts.filter(a => !a.isRead).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 text-gray-500">{error}</div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
          <p className="text-gray-500">
            {unreadCount > 0 ? `${unreadCount} alertas sin leer` : 'Todas las alertas leídas'}
          </p>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          <CheckCircle className="h-4 w-4" />
          Marcar todas como leídas
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['critical', 'high', 'medium', 'low'] as const).map(severity => {
          const count = alerts.filter(a => a.severity === severity).length;
          return (
            <div
              key={severity}
              onClick={() => setFilter(severity)}
              className={cn(
                'rounded-xl p-4 cursor-pointer transition-all border-2',
                filter === severity
                  ? `${severityStyles[severity].bg} border-current`
                  : 'bg-white border-transparent hover:border-gray-200'
              )}
            >
              <div className={cn(
                'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                severityStyles[severity].badge
              )}>
                {severityLabels[severity]}
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
              <p className="text-sm text-gray-500">alertas</p>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-4">
        <Filter className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500 mr-2">Filtrar:</span>
        {[
          { value: 'all', label: 'Todas' },
          { value: 'unread', label: `Sin leer (${unreadCount})` },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as FilterType)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filter === tab.value
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alertas ({filteredAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay alertas con este filtro</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredAlerts.map((alert) => {
                    const Icon = typeIcons[alert.type] || AlertTriangle;
                    const styles = severityStyles[alert.severity];
                    return (
                      <div
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert.id)}
                        className={cn(
                          'px-6 py-4 border-l-4 cursor-pointer transition-all',
                          styles.border,
                          selectedAlert === alert.id ? styles.bg : 'hover:bg-gray-50',
                          !alert.isRead && 'bg-opacity-50'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'mt-0.5 rounded-lg p-2',
                            styles.bg
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
                                styles.badge
                              )}>
                                {severityLabels[alert.severity]}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {alert.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              {alert.cropName && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                  <Leaf className="h-3 w-3" />
                                  {alert.cropName}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                {typeLabels[alert.type]}
                              </span>
                              <span className="text-xs text-gray-400">
                                {getRelativeTime(alert.timestamp)}
                              </span>
                            </div>
                          </div>
                          {!alert.isRead && (
                            <div className="h-2 w-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alert details */}
        <div>
          {activeAlert ? (
            <Card>
              <CardHeader className={cn(
                'rounded-t-xl',
                severityStyles[activeAlert.severity].bg
              )}>
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = typeIcons[activeAlert.type] || AlertTriangle;
                    return (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80">
                        <Icon className={cn(
                          'h-5 w-5',
                          activeAlert.severity === 'critical' ? 'text-red-600' :
                          activeAlert.severity === 'high' ? 'text-orange-600' :
                          activeAlert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        )} />
                      </div>
                    );
                  })()}
                  <div>
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      severityStyles[activeAlert.severity].badge
                    )}>
                      {severityLabels[activeAlert.severity]}
                    </span>
                    <p className="text-sm text-gray-600 mt-1">{typeLabels[activeAlert.type]}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{activeAlert.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDateTime(activeAlert.timestamp)}
                  </p>
                </div>

                <p className="text-gray-700">{activeAlert.message}</p>

                {activeAlert.cropName && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                    <Leaf className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Cultivo afectado:</span>
                    <span className="text-sm font-medium text-gray-900">{activeAlert.cropName}</span>
                  </div>
                )}

                {activeAlert.aiRecommendation && (
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-purple-700">Recomendación IA</span>
                    </div>
                    <p className="text-sm text-gray-700">{activeAlert.aiRecommendation}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleMarkAsRead(activeAlert.id)}
                    className="flex-1 rounded-lg bg-green-500 px-4 py-2 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                  >
                    Marcar resuelta
                  </button>
                  <button className="rounded-lg border border-gray-200 px-4 py-2 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                    Ignorar
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <CardContent className="text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Selecciona una alerta para ver los detalles</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
