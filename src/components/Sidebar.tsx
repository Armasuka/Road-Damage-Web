import React from 'react';
import { LayoutDashboard, Send, History, BarChart3, LogOut, Map } from './icons';
import { JalurLogo } from './icons';
import { cn } from '../lib/utils';
import { Role } from '../App';
import { motion } from 'motion/react';

export type View = 'dashboard' | 'report' | 'history' | 'analytics';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  role: Role;
  onLogout: () => void;
}

export default function Sidebar({ currentView, onViewChange, role, onLogout }: SidebarProps) {
  const adminNavItems = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'history', label: 'Riwayat Laporan', icon: History },
    { id: 'analytics', label: 'Analitik', icon: BarChart3 },
  ] as const;

  const wargaNavItems = [
    { id: 'dashboard', label: 'Peta Pemantauan', icon: Map },
    { id: 'report', label: 'Lapor Cepat', icon: Send }
  ] as const;

  const navItems = role === 'admin' ? adminNavItems : wargaNavItems;

  return (
    <aside className="w-72 flex flex-col shrink-0 h-screen sticky top-0 z-50" style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
      {/* Logo */}
      <div className="p-6 h-20 flex items-center" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <JalurLogo size={28} />
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-1">
        <div className="px-8 mb-3">
          <span className="eyebrow">Navigasi</span>
        </div>
        <nav className="space-y-1 px-4">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "relative w-full",
                  isActive ? "btn-nav-active" : "btn-ghost"
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full"
                    style={{ background: 'var(--color-brand-yellow)' }}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <item.icon className={cn(
                  "w-[18px] h-[18px] transition-transform duration-200",
                  isActive ? "scale-110" : ""
                )} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 space-y-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button onClick={onLogout} className="btn-ghost hover:!text-red-600 hover:!bg-red-50">
          <LogOut className="w-[18px] h-[18px]" />
          Keluar
        </button>
        
        <div className="p-3.5 rounded-2xl" style={{ background: 'var(--color-surface-cream)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm display-serif",
              role === 'admin' ? "bg-brand-blue text-brand-yellow" : "bg-brand-yellow text-brand-blue"
            )}>
              {role === 'admin' ? 'A' : 'W'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">
                {role === 'admin' ? 'Admin Kemang' : 'Warga Kemang'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-on-surface-muted)' }}>
                {role === 'admin' ? 'Seksi Pengawasan' : 'Partisipan Publik'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
