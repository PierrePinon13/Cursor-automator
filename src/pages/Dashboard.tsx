
import { useState } from 'react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useUserRole } from '@/hooks/useUserRole';
import StatsCards from '@/components/dashboard/StatsCards';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import ProcessingMetrics from '@/components/dashboard/ProcessingMetrics';
import DiagnosticsPanel from '@/components/dashboard/DiagnosticsPanel';
import UserStatsTable from '@/components/dashboard/UserStatsTable';
import AppointmentsSection from '@/components/dashboard/AppointmentsSection';
import TimeRangeSelector from '@/components/dashboard/TimeRangeSelector';
import ViewSelector from '@/components/dashboard/ViewSelector';
import { useSidebar } from '@/components/ui/sidebar';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'processing'>('overview');
  const { toggleSidebar } = useSidebar();
  const { isAdmin } = useUserRole();
  
  const { stats, loading, error } = useDashboardStats(timeRange);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Erreur lors du chargement du dashboard</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <CustomSidebarTrigger />
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <TimeRangeSelector timeRange={timeRange} onTimeRangeChange={setTimeRange} />
          <ViewSelector viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rendez-vous */}
            <AppointmentsSection />
            
            {/* Charts */}
            <DashboardCharts stats={stats} timeRange={timeRange} />
          </div>
        )}

        {viewMode === 'detailed' && (
          <div className="space-y-6">
            {/* User Stats Table */}
            <UserStatsTable timeRange={timeRange} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rendez-vous */}
              <AppointmentsSection />
              
              {/* Charts */}
              <DashboardCharts stats={stats} timeRange={timeRange} />
            </div>
          </div>
        )}

        {viewMode === 'processing' && isAdmin && (
          <div className="space-y-6">
            {/* Processing Metrics */}
            <ProcessingMetrics />
            
            {/* Diagnostics Panel */}
            <DiagnosticsPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
