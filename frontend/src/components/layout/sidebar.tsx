'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Leaf,
  Bell,
  Camera,
  Droplets,
  Settings,
  Sprout,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Cultivos', href: '/cultivos', icon: Leaf },
  { name: 'Alertas', href: '/alertas', icon: Bell },
  { name: 'Galería', href: '/galeria', icon: Camera },
  { name: 'Riego', href: '/riego', icon: Droplets },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gradient-to-b from-green-900 to-green-950">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-green-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500">
            <Sprout className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Mallki Sapan</h1>
            <p className="text-xs text-green-300">Huerta Inteligente</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : 'text-green-100 hover:bg-green-800/50 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-green-800 p-4">
          <div className="rounded-lg bg-green-800/50 p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-200">Sistema activo</span>
            </div>
            <p className="mt-1 text-xs text-green-400">
              Arduino conectado
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
