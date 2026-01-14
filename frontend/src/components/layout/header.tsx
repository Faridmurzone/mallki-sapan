'use client';

import { Bell, Search, Sun, Moon } from 'lucide-react';
import { alerts } from '@/lib/mock-data';

export function Header() {
  const unreadAlerts = alerts.filter(a => !a.isRead).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cultivos, alertas..."
            className="h-10 w-80 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Weather widget */}
        <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-50 to-sky-50 px-4 py-2">
          <Sun className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">24.5°C</p>
            <p className="text-xs text-gray-500">Soleado</p>
          </div>
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadAlerts > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {unreadAlerts}
            </span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <span className="text-sm font-medium text-white">F</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">Farid</p>
            <p className="text-xs text-gray-500">Administrador</p>
          </div>
        </div>
      </div>
    </header>
  );
}
