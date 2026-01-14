import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
}

const colorClasses = {
  green: {
    bg: 'bg-green-50',
    iconBg: 'bg-green-500',
  },
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-500',
  },
  yellow: {
    bg: 'bg-yellow-50',
    iconBg: 'bg-yellow-500',
  },
  red: {
    bg: 'bg-red-50',
    iconBg: 'bg-red-500',
  },
  purple: {
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-500',
  },
};

export function StatsCard({ title, value, unit, icon: Icon, trend, color }: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-lg text-gray-500">{unit}</span>}
          </div>
          {trend && (
            <div className={cn(
              'mt-2 inline-flex items-center text-sm',
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="ml-1 text-gray-500">vs ayer</span>
            </div>
          )}
        </div>
        <div className={cn('rounded-lg p-3', colors.iconBg)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
