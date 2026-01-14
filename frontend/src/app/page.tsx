import { StatsCard } from '@/components/dashboard/stats-card';
import { SensorChart } from '@/components/dashboard/sensor-chart';
import { CropsOverview } from '@/components/dashboard/crops-overview';
import { AlertsPanel } from '@/components/dashboard/alerts-panel';
import { IrrigationStatus } from '@/components/dashboard/irrigation-status';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { dashboardStats } from '@/lib/mock-data';
import {
  Leaf,
  Heart,
  Bell,
  Droplets,
  Thermometer,
  CloudRain,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Resumen del estado de tu huerta</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Cultivos Activos"
          value={dashboardStats.totalCrops}
          icon={Leaf}
          color="green"
        />
        <StatsCard
          title="Salud Promedio"
          value={dashboardStats.healthyPercentage}
          unit="%"
          icon={Heart}
          color="green"
          trend={{ value: 3, isPositive: true }}
        />
        <StatsCard
          title="Alertas Activas"
          value={dashboardStats.activeAlerts}
          icon={Bell}
          color={dashboardStats.activeAlerts > 0 ? 'red' : 'green'}
        />
        <StatsCard
          title="Agua Hoy"
          value={dashboardStats.waterUsageToday}
          unit="L"
          icon={Droplets}
          color="blue"
          trend={{ value: 12, isPositive: false }}
        />
        <StatsCard
          title="Temperatura"
          value={dashboardStats.currentTemperature}
          unit="°C"
          icon={Thermometer}
          color="yellow"
        />
        <StatsCard
          title="Humedad Suelo"
          value={dashboardStats.avgSoilHumidity}
          unit="%"
          icon={CloudRain}
          color="blue"
        />
      </div>

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
