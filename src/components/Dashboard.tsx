import React, { useState } from 'react';
import MapDisplay from './MapDisplay';
import EmptyState from './EmptyState';
import { ShieldAlert, AlertTriangle, CheckCircle, TrendingDown, ArrowRight, Send, ListOrdered, MapPin } from './icons';
import { motion } from 'motion/react';
import { AnimatedNumber } from '../lib/useCountUp';
import { format } from 'date-fns';
import L from 'leaflet';
import { Role } from '../App';

interface DashboardProps {
  reports: any[];
  role?: Role;
  onNavigate?: (view: string) => void;
}

const ease = [0.22, 1, 0.36, 1] as const;

const tileVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease }
  })
};

export default function Dashboard({ reports, role, onNavigate }: DashboardProps) {
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const visibleReports = mapBounds
    ? reports.filter(r => mapBounds.contains([r.latitude, r.longitude]))
    : reports;

  const handleBoundsChange = (bounds: L.LatLngBounds) => {
    setMapBounds(bounds);
  };

  const analyzedReports = reports.filter(r => r.rdsScore > 0);
  const avgRDS = analyzedReports.length > 0
    ? Math.round(analyzedReports.reduce((acc, r) => acc + r.rdsScore, 0) / analyzedReports.length)
    : 0;
  const diteruskanCount = reports.filter(r => r.status === 'diteruskan').length;
  const severeCount = analyzedReports.filter(r => r.rdsScore < 40).length;

  const stats = [
    { label: 'Total Laporan', value: reports.length, icon: ShieldAlert },
    { label: 'Kerusakan Parah', value: severeCount, icon: AlertTriangle },
    { label: 'Terselesaikan', value: diteruskanCount, icon: CheckCircle },
    { label: 'Rata-rata RDS', value: analyzedReports.length > 0 ? avgRDS : '--', icon: TrendingDown },
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
              style={{ minHeight: '120px' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="eyebrow">{stat.label}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-blue-50)' }}>
                  <stat.icon className="w-[18px] h-[18px]" />
                </div>
              </div>
              <AnimatedNumber value={stat.value} className="display-serif" style={{ fontSize: 'clamp(36px, 8vw, 60px)', fontWeight: 300, letterSpacing: '-0.04em', color: 'var(--color-brand-blue)', lineHeight: 1 }} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Admin Priority Banner */}
      {role !== 'warga' && (() => {
        const criticalCount = reports.filter(r => r.rdsScore > 0 && r.rdsScore < 40 && r.status !== 'diteruskan').length;
        return (
          <motion.div
            variants={tileVariant} initial="hidden" animate="visible" custom={4}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl cursor-pointer group transition-shadow hover:shadow-md"
            style={{ background: criticalCount > 0 ? '#fef2f2' : 'var(--color-brand-blue-50)', border: `1px solid ${criticalCount > 0 ? '#fca5a5' : 'var(--color-brand-blue-100)'}`, padding: '20px' }}
            onClick={() => onNavigate?.('priority')}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: criticalCount > 0 ? '#ef4444' : 'var(--color-brand-blue)', color: '#fff' }}>
                <ListOrdered className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: criticalCount > 0 ? '#dc2626' : 'var(--color-brand-blue)' }}>
                  {criticalCount > 0
                    ? `${criticalCount} jalan prioritas tinggi menunggu penanganan`
                    : 'Lihat daftar prioritas penanganan jalan'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-on-surface-muted)' }}>
                  Urutan berdasarkan RDS terkecil
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold shrink-0 transition-all group-hover:gap-3"
              style={{ color: criticalCount > 0 ? '#dc2626' : 'var(--color-brand-blue)' }}>
              Buka Prioritas <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        );
      })()}

      {/* Split Screen: Listing + Map */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '16px', alignItems: 'stretch' }}>
        {/* Left: Listing Cards */}
        <div style={{ maxHeight: '520px', overflowY: 'auto' }} className="custom-scrollbar pr-1">
          {visibleReports.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {visibleReports.map((report, i) => {
                let imgSrc = report.imageUrl;
                try {
                  const parsed = JSON.parse(report.imageUrl);
                  if (Array.isArray(parsed) && parsed.length > 0) imgSrc = parsed[0];
                } catch (e) {}

                const color = report.rdsScore < 40 ? '#ef4444' : report.rdsScore < 70 ? '#f59e0b' : '#22c55e';
                const severityLabel = report.rdsScore < 40 ? 'Parah' : report.rdsScore < 70 ? 'Sedang' : 'Ringan';

                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="tile p-0 overflow-hidden cursor-pointer"
                    style={{ transition: 'box-shadow 0.2s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = ''}
                  >
                    <div style={{ position: 'relative', aspectRatio: '16/10' }}>
                      <img src={imgSrc} alt="Kerusakan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        padding: '4px 10px', borderRadius: '8px',
                        fontSize: '11px', fontWeight: '700',
                        background: color, color: 'white',
                      }}>
                        RDS {report.rdsScore > 0 ? report.rdsScore : '--'}
                      </div>
                    </div>
                    <div style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', background: color + '20', color: color }}>
                          {severityLabel}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-on-surface-muted)' }}>
                          {report.createdAt ? format(new Date(report.createdAt), 'dd MMM yyyy') : 'Baru'}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-on-surface)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {report.kodeUnik || 'Laporan Baru'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <MapPin size={12} style={{ color: 'var(--color-on-surface-muted)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--color-on-surface-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {report.address || 'Kemang, Bogor'}
                        </span>
                      </div>
                      <div style={{
                        marginTop: '8px', padding: '4px 8px', borderRadius: '6px', display: 'inline-block',
                        background: report.status === 'pending' ? '#fef3c7' : report.status === 'reviewed' ? '#dbeafe' : '#d1fae5',
                      }}>
                        <span style={{
                          fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
                          color: report.status === 'pending' ? '#92400e' : report.status === 'reviewed' ? '#1e40af' : '#065f46',
                        }}>
                          {report.status}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="tile" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--color-on-surface-muted)' }}>
                Tidak ada laporan di area ini.
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-on-surface-muted)', marginTop: '4px' }}>
                Zoom atau geser map untuk melihat laporan.
              </p>
            </div>
          )}
        </div>

        {/* Right: Map */}
        <div style={{ height: '520px', borderRadius: '24px', overflow: 'hidden' }}>
          <MapDisplay reports={reports} onBoundsChange={handleBoundsChange} />
        </div>
      </div>

      {/* Quick Actions for Warga */}
      {role === 'warga' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div
            variants={tileVariant} initial="hidden" animate="visible" custom={6}
            className="tile p-6 cursor-pointer group transition-shadow duration-200 hover:shadow-md"
            onClick={() => onNavigate?.('report')}
            style={{ background: 'var(--color-brand-yellow-50)', border: '1px solid var(--color-brand-yellow-100)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-brand-yellow-700)' }}>Aksi Cepat</span>
                <h3 className="display-serif text-2xl mt-2">Laporkan kerusakan</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-muted)' }}>Foto, kirim, selesai dalam 60 detik.</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-brand-blue)', color: 'var(--color-brand-yellow)' }}>
                <Send size={18} />
              </div>
            </div>
          </motion.div>
          <motion.div
            variants={tileVariant} initial="hidden" animate="visible" custom={7}
            className="tile p-6"
          >
            <span className="eyebrow">Statistik Wilayah</span>
            <div className="flex items-end gap-8 mt-4">
              <div>
                <span className="display-serif text-4xl" style={{ color: 'var(--color-brand-blue)', lineHeight: 1 }}>{reports.length}</span>
                <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--color-on-surface-muted)' }}>Total laporan</p>
              </div>
              <div>
                <span className="display-serif text-4xl" style={{ color: '#ef4444', lineHeight: 1 }}>{severeCount}</span>
                <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--color-on-surface-muted)' }}>Parah</p>
              </div>
              <div>
                <span className="display-serif text-4xl" style={{ color: 'var(--color-success)', lineHeight: 1 }}>{diteruskanCount}</span>
                <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--color-on-surface-muted)' }}>Ditangani</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
