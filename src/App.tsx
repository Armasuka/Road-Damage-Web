import React, { useState, useEffect } from 'react';
import Sidebar, { View } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ReportForm from './components/ReportForm';
import HistoryList from './components/HistoryList';
import LandingPage from './components/LandingPage';
import AdminLogin from './components/AdminLogin';
import { BarChart3 } from './components/icons';
import AnalyticsView from './components/AnalyticsView';
import { motion, AnimatePresence } from 'motion/react';

export type Role = 'warga' | 'admin' | null;

export default function App() {
  const [currentView, setCurrentView] = useState<View>('report');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data);
    } catch (err) {
      console.error("API error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role !== null) {
      if (role === 'admin') {
        setCurrentView('dashboard');
      } else {
        setCurrentView('report');
      }
      fetchReports();
      const interval = setInterval(fetchReports, 10000);
      return () => clearInterval(interval);
    }
  }, [role]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await fetch(`/api/reports/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchReports();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDetect = async (id: number) => {
    try {
      const response = await fetch(`/api/reports/${id}/detect`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchReports(); // Refresh to get the new RDS and detections
      }
    } catch (error) {
      console.error("Detect error:", error);
    }
  };

  if (showAdminLogin) {
    return <AdminLogin onLogin={() => { setRole('admin'); setShowAdminLogin(false); }} onBack={() => setShowAdminLogin(false)} />;
  }

  if (role === null) {
    return <LandingPage onEnter={(r) => {
      if (r === 'admin') {
        setShowAdminLogin(true);
      } else {
        setRole('warga');
      }
    }} />;
  }

  return (
    <div className="flex min-h-screen font-sans selection:bg-brand-yellow/30 selection:text-brand-blue" style={{ background: 'var(--color-surface-cream)', color: 'var(--color-on-surface)' }}>
      <Sidebar currentView={currentView} onViewChange={setCurrentView} role={role} onLogout={() => setRole(null)} />
      
      <main className="flex-1 min-h-screen overflow-hidden overflow-y-auto">
        <header className="h-20 flex items-center px-8 sticky top-0 z-50" style={{ background: 'rgba(251, 249, 244, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <span className="eyebrow" style={{ fontSize: '12px', color: 'var(--color-on-surface-muted)' }}>
              {role === 'admin' ? 'Admin' : 'Warga'}
            </span>
            <span style={{ color: 'var(--color-border)' }}>/</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-brand-blue)' }}>
              {currentView === 'dashboard' && (role === 'warga' ? 'Peta Pemantauan' : 'Ringkasan Sistem')}
              {currentView === 'report' && 'Pengiriman Laporan'}
              {currentView === 'history' && 'Data Riwayat'}
              {currentView === 'analytics' && 'Analisis Mendalam'}
            </span>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'dashboard' && <Dashboard reports={reports} role={role} onNavigate={(v) => setCurrentView(v as View)} />}
              {currentView === 'report' && <ReportForm onSuccess={fetchReports} onNavigateMap={() => setCurrentView('dashboard')} />}
              {currentView === 'history' && <HistoryList reports={reports} onStatusChange={handleStatusChange} isAdmin={role === 'admin'} onDetect={handleDetect} onNavigateReport={() => setCurrentView('report')} />}
              {currentView === 'analytics' && <AnalyticsView reports={reports} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
