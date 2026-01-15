'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { SensorChart } from '@/components/dashboard/sensor-chart';
import { CropsOverview } from '@/components/dashboard/crops-overview';
import { AlertsPanel } from '@/components/dashboard/alerts-panel';
import { IrrigationStatus } from '@/components/dashboard/irrigation-status';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { getDashboardStats } from '@/lib/api';
import type { DashboardStats } from '@/types';
import {
  Leaf,
  Heart,
  Bell,
  Droplets,
  Thermometer,
  CloudRain,
  Loader2,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Resumen del estado de tu huerta</p>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-gray-500">{error}</div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard
            title="Cultivos Activos"
            value={stats.totalCrops}
            icon={Leaf}
            color="green"
          />
          <StatsCard
            title="Salud Promedio"
            value={stats.healthyPercentage}
            unit="%"
            icon={Heart}
            color="green"
            trend={{ value: 3, isPositive: true }}
          />
          <StatsCard
            title="Alertas Activas"
            value={stats.activeAlerts}
            icon={Bell}
            color={stats.activeAlerts > 0 ? 'red' : 'green'}
          />
          <StatsCard
            title="Agua Hoy"
            value={stats.waterUsageToday}
            unit="L"
            icon={Droplets}
            color="blue"
            trend={{ value: 12, isPositive: false }}
          />
          <StatsCard
            title="Temperatura"
            value={stats.currentTemperature}
            unit="°C"
            icon={Thermometer}
            color="yellow"
          />
          <StatsCard
            title="Humedad Suelo"
            value={stats.avgSoilHumidity}
            unit="%"
            icon={CloudRain}
            color="blue"
          />
        </div>
      ) : null}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <SensorChart />
          <CropsOverview />
        </div>

        {/* Right column - 1/3 width */}
        <div className="space-y-6">
          <AlertsPanel />
          <IrrigationStatus />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
