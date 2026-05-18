import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ExternalLink, Filter, Search, ArrowRight, BrainCircuit, Loader2, X, MapPin, ChevronLeft, ChevronRight, Eye, EyeOff } from './icons';
import { getStatusColor, getScoreColor } from '../lib/utils';
import { Report } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryListProps {
  reports: Report[];
  isAdmin: boolean;
  onStatusChange: (id: number, status: string) => void;
  onDetect?: (id: number) => Promise<void>;
  onNavigateReport?: () => void;
}

export default function HistoryList({ reports, isAdmin, onStatusChange, onDetect, onNavigateReport }: HistoryListProps) {
  const [detectingId, setDetectingId] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [imgDims, setImgDims] = useState({w: 1, h: 1});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    setCurrentImgIdx(0);
    setImgDims({w: 1, h: 1});
  }, [selectedReport]);

  const modalImages = useMemo(() => {
    if (!selectedReport?.imageUrl) return [];
    try {
      const parsed = JSON.parse(selectedReport.imageUrl);
      if (Array.isArray(parsed)) return parsed;
    } catch(e) {}
    return [selectedReport.imageUrl];
  }, [selectedReport]);

  const handleDetectClick = async (id: number) => {
    if (!onDetect) return;
    setDetectingId(id);
    await onDetect(id);
    setDetectingId(null);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-status-pending';
      case 'reviewed': return 'badge-status-reviewed';
      case 'resolved': return 'badge-status-resolved';
      default: return 'badge-status-pending';
    }
  };

  const filteredReports = useMemo(() => {
    let result = reports;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.kodeUnik || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.address || '').toLowerCase().includes(q) ||
        (r.deskripsi || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    return result;
  }, [reports, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="display-serif text-4xl">Riwayat Laporan</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
            <input 
              type="text"
              placeholder="Cari kode, email, alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-base pl-10 pr-4 py-2 text-xs"
              style={{ width: '240px' }}
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
              style={{ 
                background: statusFilter !== 'all' ? 'var(--color-brand-blue-50)' : 'var(--color-surface)', 
                border: `1px solid ${statusFilter !== 'all' ? 'var(--color-brand-blue-100)' : 'var(--color-border)'}` 
              }}
            >
              <Filter className="w-4 h-4" />
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-40 py-2 rounded-2xl z-50" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 8px 30px rgba(15,23,42,0.12)' }}>
                {['all', 'pending', 'reviewed', 'resolved'].map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setShowFilterMenu(false); }}
                    className="w-full px-4 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--color-surface-cream)]"
                    style={{ color: statusFilter === s ? 'var(--color-brand-blue)' : 'var(--color-on-surface-muted)', fontWeight: statusFilter === s ? 700 : 500 }}
                  >
                    {s === 'all' ? 'Semua Status' : s === 'pending' ? '⏳ Pending' : s === 'reviewed' ? '👁 Reviewed' : '✅ Resolved'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto card">
        <table className="w-full text-left text-sm">
          <thead style={{ background: 'var(--color-surface-cream)', borderBottom: '1px solid var(--color-border)' }}>
            <tr>
              <th className="px-6 py-4 eyebrow" style={{ fontSize: '11px' }}>Informasi Laporan</th>
              <th className="px-6 py-4 eyebrow" style={{ fontSize: '11px' }}>Waktu</th>
              <th className="px-6 py-4 eyebrow" style={{ fontSize: '11px' }}>RDS Score</th>
              <th className="px-6 py-4 eyebrow" style={{ fontSize: '11px' }}>Status</th>
              <th className="px-6 py-4 eyebrow" style={{ fontSize: '11px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report) => (
              <tr 
                key={report.id} 
                className="hover:bg-[var(--color-surface-cream)] transition-colors cursor-pointer group"
                style={{ borderBottom: '1px solid var(--color-border)' }}
                onClick={() => setSelectedReport(report)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0" style={{ border: '1px solid var(--color-border)', background: '#f1f5f9' }}>
                      {(() => {
                        let firstImg = report.imageUrl;
                        try {
                          const parsed = JSON.parse(firstImg);
                          if (Array.isArray(parsed) && parsed.length > 0) firstImg = parsed[0];
                        } catch (e) {}
                        return firstImg ? <img src={firstImg} alt="Damage" className="w-full h-full object-cover" /> : null;
                      })()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold" style={{ color: 'var(--color-on-surface)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{report.kodeUnik || 'Laporan'}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-surface-cream)', color: 'var(--color-on-surface-muted)' }}>
                          {report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                        </span>
                      </div>
                      <p className="text-xs mt-1 line-clamp-2 max-w-[250px]" style={{ color: 'var(--color-on-surface-muted)' }} title={report.deskripsi}>
                        {report.deskripsi || 'Tidak ada deskripsi'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-on-surface-muted)' }}>
                  {report.createdAt ? 
                    format(new Date(report.createdAt), 'dd MMM yyyy, HH:mm') 
                    : '-'
                  }
                </td>
                <td className="px-6 py-4" style={{ fontFamily: 'var(--font-mono)' }}>
                  {report.rdsScore === 0 ? (
                    isAdmin ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDetectClick(report.id); }}
                        disabled={detectingId === report.id}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                        style={{ background: 'var(--color-brand-blue-50)', color: 'var(--color-brand-blue)' }}
                      >
                        {detectingId === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                        Cek AI
                      </button>
                    ) : (
                      <span className="text-xs px-2" style={{ color: 'var(--color-on-surface-muted)' }}>Belum dianalisis</span>
                    )
                  ) : (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${report.rdsScore < 50 ? 'badge-accent' : ''}`}
                      style={report.rdsScore >= 50 ? { background: 'var(--color-brand-blue-50)', color: 'var(--color-brand-blue)' } : {}}
                    >
                      {report.rdsScore}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {isAdmin ? (
                    <select 
                      value={report.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onStatusChange(report.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer outline-none ${getStatusBadgeClass(report.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  ) : (
                    <span className={getStatusBadgeClass(report.status)}>
                      {report.status}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:shadow-md" 
                    style={{ background: 'var(--color-surface-cream)', border: '1px solid var(--color-border)' }}
                    title="Lihat detail"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredReports.length === 0 && (
          <div className="py-20 text-center space-y-3">
            <p className="text-sm font-medium" style={{ color: 'var(--color-on-surface-muted)' }}>
              {searchQuery || statusFilter !== 'all' ? 'Tidak ada laporan yang cocok dengan filter.' : 'Belum ada laporan yang tersedia.'}
            </p>
            {searchQuery || statusFilter !== 'all' ? (
              <button 
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                className="flex items-center justify-center gap-1 mx-auto text-sm font-semibold" 
                style={{ color: 'var(--color-brand-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Reset Filter
              </button>
            ) : onNavigateReport ? (
              <button 
                onClick={onNavigateReport}
                className="flex items-center justify-center gap-1 mx-auto text-sm font-semibold" 
                style={{ color: 'var(--color-brand-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Mulai Laporkan <ArrowRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Review Modal ───────────────────────── */}
      <AnimatePresence>
        {selectedReport && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="fixed inset-0 z-[100]"
              style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1080px] max-h-[90vh] z-[101] overflow-hidden flex flex-col md:flex-row"
              style={{ background: 'var(--color-surface-cream)', borderRadius: '28px', boxShadow: '0 40px 80px rgba(15,23,42,0.4)' }}
            >
              {/* Close button */}
              <button 
                onClick={() => setSelectedReport(null)}
                className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors"
                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--color-border)' }}
              >
                <X className="w-4 h-4" />
              </button>

              {/* LEFT: Image Gallery */}
              <div className="md:w-[52%] relative flex items-center justify-center min-h-[300px]" style={{ background: '#0f172a' }}>
                {modalImages.length > 0 && (
                  <div className="relative max-w-full max-h-full inline-block">
                    <img 
                      src={modalImages[currentImgIdx]} 
                      alt="Kerusakan" 
                      className="max-w-full max-h-[50vh] md:max-h-[90vh] block w-auto h-auto"
                      style={{ borderRadius: '18px', margin: '24px' }}
                      onLoad={(e) => setImgDims({w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight})}
                    />
                    
                    {/* Bounding Boxes */}
                    {showOverlay && selectedReport.detections?.filter(d => d.image_index === currentImgIdx || d.image_index === undefined).map((det, i) => {
                       const left = (det.bbox.x / imgDims.w) * 100;
                       const top = (det.bbox.y / imgDims.h) * 100;
                       const width = (det.bbox.width / imgDims.w) * 100;
                       const height = (det.bbox.height / imgDims.h) * 100;
                       
                       const isHighConf = det.confidence > 0.5;

                       return (
                         <div key={i} style={{
                           position: 'absolute',
                           left: `${left}%`,
                           top: `${top}%`,
                           width: `${width}%`,
                           height: `${height}%`,
                           border: `2px solid ${isHighConf ? 'var(--color-brand-blue)' : 'var(--color-brand-yellow)'}`,
                           backgroundColor: isHighConf ? 'rgba(30,58,138,0.1)' : 'rgba(250,204,21,0.1)',
                           borderRadius: '4px',
                         }}>
                           <span className="absolute -top-5 left-0 px-2 py-0.5 text-[8px] font-bold text-white whitespace-nowrap rounded" style={{ 
                             background: isHighConf ? 'var(--color-brand-blue)' : 'var(--color-brand-yellow)',
                             color: isHighConf ? '#fff' : 'var(--color-brand-blue)',
                             fontFamily: 'var(--font-sans)'
                           }}>
                             {det.class} {Math.round(det.confidence*100)}%
                           </span>
                         </div>
                       );
                    })}
                  </div>
                )}
                
                {/* Gallery Controls */}
                {modalImages.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentImgIdx(p => p > 0 ? p - 1 : modalImages.length - 1)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white"
                      style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setCurrentImgIdx(p => p < modalImages.length - 1 ? p + 1 : 0)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white"
                      style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {modalImages.map((_, i) => (
                        <div 
                          key={i} 
                          className="h-[7px] rounded-full cursor-pointer transition-all" 
                          style={{ 
                            width: i === currentImgIdx ? '24px' : '7px',
                            background: i === currentImgIdx ? 'var(--color-brand-yellow)' : 'rgba(255,255,255,0.4)' 
                          }}
                          onClick={() => setCurrentImgIdx(i)} 
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* AI Toggle */}
                <div className="absolute top-8 left-8 z-10">
                  <button 
                    onClick={() => setShowOverlay(!showOverlay)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-[10px] font-bold transition-colors uppercase tracking-widest"
                    style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-brand-yellow)' }} />
                    {showOverlay ? <><EyeOff className="w-4 h-4" /> Hide AI</> : <><Eye className="w-4 h-4" /> Show AI</>}
                  </button>
                </div>

                {/* Mobile close */}
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="absolute top-8 right-8 w-10 h-10 rounded-full flex items-center justify-center text-white md:hidden"
                  style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* RIGHT: Editorial Details */}
              <div className="md:w-[48%] p-10 md:p-12 overflow-y-auto custom-scrollbar flex flex-col gap-6" style={{ background: 'var(--color-surface-cream)' }}>
                {/* Header */}
                <div>
                  <span className="eyebrow">Laporan warga</span>
                  <div className="flex items-baseline gap-3 mt-2">
                    <h2 className="display-serif" style={{ fontSize: '44px', letterSpacing: '-0.03em', color: 'var(--color-brand-blue)', lineHeight: 1, fontFeatureSettings: '"tnum"' }}>
                      {selectedReport.kodeUnik || 'Laporan'}
                    </h2>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-on-surface-muted)' }}>
                      {selectedReport.createdAt ? format(new Date(selectedReport.createdAt), 'dd MMM yyyy, HH:mm') : ''}
                    </span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <span className={getStatusBadgeClass(selectedReport.status)}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                    {selectedReport.status === 'pending' ? 'Menunggu' : selectedReport.status === 'reviewed' ? 'Ditinjau' : 'Selesai'}
                  </span>
                  {selectedReport.rdsScore > 0 && (
                    <span className={`${selectedReport.rdsScore < 50 ? 'badge-accent' : ''}`}
                      style={selectedReport.rdsScore >= 50 ? { 
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '5px 12px', borderRadius: '9999px',
                        fontSize: '11px', fontWeight: 700,
                        background: 'var(--color-brand-blue-50)', color: 'var(--color-brand-blue)'
                      } : {}}
                    >
                      RDS {selectedReport.rdsScore}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span className="eyebrow mb-2 block">Deskripsi warga</span>
                  {selectedReport.deskripsi ? (
                    <p className="display-serif text-lg leading-relaxed" style={{ fontStyle: 'italic' }}>
                      <span style={{ color: 'var(--color-brand-yellow)', fontSize: '24px' }}>"</span>
                      {selectedReport.deskripsi}
                      <span style={{ color: 'var(--color-brand-yellow)', fontSize: '24px' }}>"</span>
                    </p>
                  ) : (
                    <p className="text-sm italic" style={{ color: 'var(--color-on-surface-muted)' }}>Tidak ada deskripsi tambahan.</p>
                  )}
                </div>

                {/* Location */}
                <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span className="eyebrow mb-2 block">Lokasi</span>
                  <div className="flex items-start gap-2 p-3.5 rounded-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <MapPin className="w-[18px] h-[18px] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold leading-tight mb-1">{selectedReport.address}</p>
                      <p className="text-xs" style={{ color: 'var(--color-on-surface-muted)', fontFamily: 'var(--font-mono)' }}>
                        {selectedReport.latitude}, {selectedReport.longitude}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Detections */}
                {selectedReport.detections && selectedReport.detections.length > 0 && (
                  <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <span className="eyebrow mb-3 block">Deteksi AI · {selectedReport.detections.length} objek</span>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedReport.detections.map((det, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: i % 2 === 0 ? 'var(--color-brand-blue)' : 'var(--color-brand-yellow)' }} />
                            <span className="font-semibold text-xs capitalize">{det.class}</span>
                          </div>
                          <span className="text-[11px] font-semibold" style={{ color: 'var(--color-brand-blue)', fontFamily: 'var(--font-mono)' }}>
                            {Math.round(det.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Detect button (admin only, RDS=0) */}
                {isAdmin && selectedReport.rdsScore === 0 && (
                  <div className="mt-auto pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <button 
                      onClick={async () => {
                        await handleDetectClick(selectedReport.id);
                        setSelectedReport(null);
                      }}
                      disabled={detectingId === selectedReport.id}
                      className="btn-primary w-full py-4 text-base"
                    >
                      {detectingId === selectedReport.id ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Menganalisis...</>
                      ) : (
                        <>
                          <BrainCircuit className="w-5 h-5" /> Cek Kerusakan via AI
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background: 'var(--color-brand-blue)', color: 'var(--color-brand-yellow)' }}>→</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-[10px] mt-3 font-semibold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-muted)' }}>
                      Aksi ini akan menjalankan Model YOLO Ultralytics
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
