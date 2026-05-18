import React from 'react';
import MapDisplay from './MapDisplay';
import { ShieldAlert, AlertTriangle, CheckCircle, TrendingDown, ArrowRight, Send } from './icons';
import { motion } from 'motion/react';

import { Role } from '../App';

interface DashboardProps {
  reports: any[];
  role?: Role;
  onNavigate?: (view: string) => void;
}

const tileVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  })
};

export default function Dashboard({ reports, role, onNavigate }: DashboardProps) {
  const analyzedReports = reports.filter(r => r.rdsScore > 0);
  const avgRDS = analyzedReports.length > 0 
    ? Math.round(analyzedReports.reduce((acc, r) => acc + r.rdsScore, 0) / analyzedReports.length)
    : 0;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const severeCount = analyzedReports.filter(r => r.rdsScore < 40).length;

  const stats = [
    { label: 'Total Laporan', value: reports.length, icon: ShieldAlert },
    { label: 'Kerusakan Parah', value: severeCount, icon: AlertTriangle },
    { label: 'Terselesaikan', value: resolvedCount, icon: CheckCircle },
    { label: 'Rata-rata RDS', value: analyzedReports.length > 0 ? avgRDS : '—', icon: TrendingDown },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="display-serif text-4xl md:text-5xl">
              {role === 'warga' ? 'Peta pemantauan.' : 'Ringkasan sistem.'}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-on-surface-muted)' }}>
              {role === 'warga' 
                ? 'Sebaran laporan kerusakan jalan di Kecamatan Kemang.' 
                : 'Data kerusakan jalan Kecamatan Kemang, diperbarui setiap 10 detik.'
              }
            </p>
          </div>
          {role !== 'warga' && (
            <div className="hidden md:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-on-surface-muted)' }}>Live</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Admin stat tiles */}
      {role !== 'warga' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              variants={tileVariant} initial="hidden" animate="visible" custom={i}
              className="tile flex flex-col justify-between"
              style={{ minHeight: '155px' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="eyebrow">{stat.label}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-blue-50)' }}>
                  <stat.icon className="w-[18px] h-[18px]" />
                </div>
              </div>
              <span className="display-serif" style={{ fontSize: '60px', fontWeight: 300, letterSpacing: '-0.04em', color: 'var(--color-brand-blue)', lineHeight: 1 }}>
                {stat.value}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Warga quick action */}
      {role === 'warga' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div
            variants={tileVariant} initial="hidden" animate="visible" custom={0}
            className="tile p-7 cursor-pointer group transition-shadow duration-200 hover:shadow-md"
            onClick={() => onNavigate?.('report')}
            style={{ background: 'var(--color-brand-yellow-50)', border: '1px solid var(--color-brand-yellow-100)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-brand-yellow-700)' }}>Aksi Cepat</span>
                <h3 className="display-serif text-2xl mt-2">Laporkan kerusakan</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-muted)' }}>Foto, kirim, selesai dalam 60 detik.</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-blue)', color: 'var(--color-brand-yellow)' }}>
                <Send size={18} />
              </div>
            </div>
          </motion.div>
          <motion.div
            variants={tileVariant} initial="hidden" animate="visible" custom={1}
            className="tile p-7"
          >
            <span className="eyebrow">Statistik Wilayah</span>
            <div className="flex items-end gap-8 mt-4">
              <div>
                <span className="display-serif text-4xl" style={{ color: 'var(--color-brand-blue)', lineHeight: 1 }}>{reports.length}</span>
                <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--color-on-surface-muted)' }}>Total laporan</p>
              </div>
              <div>
                <span className="display-serif text-4xl" style={{ color: 'var(--color-on-surface)', lineHeight: 1 }}>{severeCount}</span>
                <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--color-on-surface-muted)' }}>Kerusakan parah</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Map + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: '560px' }}>
        {/* Map */}
        <motion.div
          variants={tileVariant} initial="hidden" animate="visible" custom={role === 'warga' ? 2 : 4}
          className="lg:col-span-2 tile p-0 relative overflow-hidden"
          style={{ minHeight: '500px' }}
        >
          <MapDisplay reports={reports} role={role} />
          <div className="absolute bottom-5 left-5 p-4 rounded-2xl z-[1000] max-w-[200px]" style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(12px)', border: '1px solid var(--color-border)' }}>
            <p className="eyebrow mb-1.5" style={{ color: 'var(--color-brand-blue)', fontSize: '10px' }}>Peta Sebaran</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-on-surface-muted)' }}>
              {reports.length} titik kerusakan di wilayah Kemang.
            </p>
          </div>
        </motion.div>

        {/* Activity panel */}
        <motion.div
          variants={tileVariant} initial="hidden" animate="visible" custom={role === 'warga' ? 3 : 5}
          className="tile flex flex-col gap-4 overflow-hidden"
          style={{ padding: '1.5rem' }}
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow">Aktivitas Terkini</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-brand-blue-50)', color: 'var(--color-brand-blue)' }}>
              {reports.length}
            </span>
          </div>
          <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {reports.slice(0, 6).map((report, i) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="p-3 rounded-2xl flex gap-3 transition-shadow duration-200 hover:shadow-sm cursor-pointer"
                style={{ background: 'var(--color-surface-cream)', border: '1px solid var(--color-border)' }}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0" style={{ background: '#e2e8f0' }}>
                  {(() => {
                    let firstImg = report.imageUrl;
                    try {
                      const parsed = JSON.parse(firstImg);
                      if (Array.isArray(parsed) && parsed.length > 0) firstImg = parsed[0];
                    } catch (e) {}
                    return firstImg ? <img src={firstImg} alt="" className="w-full h-full object-cover" /> : null;
                  })()}
                </div>
                <div className="space-y-1 overflow-hidden flex-1">
                  <p className="text-xs font-semibold truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                    {report.kodeUnik || 'Laporan Baru'}
                  </p>
                  <div className="flex items-center gap-2">
                    {role !== 'warga' && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${report.rdsScore < 50 ? 'badge-accent' : ''}`}
                        style={report.rdsScore >= 50 ? { background: 'var(--color-brand-blue-50)', color: 'var(--color-brand-blue)' } : {}}
                      >
                        RDS {report.rdsScore}
                      </span>
                    )}
                    <span className="text-[10px] truncate" style={{ color: 'var(--color-on-surface-muted)' }} title={report.address}>
                      {report.address || 'Kemang'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            {reports.length === 0 && (
              <p className="text-sm text-center py-16 font-medium" style={{ color: 'var(--color-on-surface-muted)' }}>Belum ada aktivitas</p>
            )}
          </div>
          
          {role !== 'warga' && onNavigate && (
            <button 
              onClick={() => onNavigate('history')}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-shadow duration-200 hover:shadow-sm flex items-center justify-center gap-2 group"
              style={{ background: 'var(--color-surface-cream)', border: '1px solid var(--color-border)', color: 'var(--color-brand-blue)' }}
            >
              Lihat Semua Laporan
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          )}
          {role === 'warga' && onNavigate && (
            <button 
              onClick={() => onNavigate('report')}
              className="btn-primary w-full py-3 text-sm group flex items-center justify-center gap-2"
            >
              Laporkan Kerusakan
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
