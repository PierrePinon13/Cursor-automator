
import { useState, useEffect } from 'react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useUserRole } from '@/hooks/useUserRole';
import StatsCards from '@/components/dashboard/StatsCards';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import ProcessingMetrics from '@/components/dashboard/ProcessingMetrics';
import DiagnosticsPanel from '@/components/dashboard/DiagnosticsPanel';
import UserStatsTable from '@/components/dashboard/UserStatsTable';
import SimpleAppointmentsCard from '@/components/appointments/SimpleAppointmentsCard';
import { useSidebar } from '@/components/ui/sidebar';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';

const Dashboard = () => {
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'processing'>('overview');
  const { toggleSidebar } = useSidebar();
  const { isAdmin } = useUserRole();
  
  const { data: dashboardData, loading } = useDashboardStats();

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

  // Extraire les stats de manière plus robuste
  const stats = dashboardData?.stats || {
    linkedin_messages: 0,
    positive_calls: 0,
    negative_calls: 0,
    success_rate: 0
  };

  // Convertir les données pour les composants existants
  const userComparison = (dashboardData?.userComparison || []).map(user => ({
    user_id: user.user_id,
    user_email: user.user_email,
    stat_date: new Date().toISOString().split('T')[0], // Date actuelle
    linkedin_messages_sent: user.stats.linkedin_messages || 0,
    positive_calls: user.stats.positive_calls || 0,
    negative_calls: user.stats.negative_calls || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    id: user.user_id
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <CustomSidebarTrigger />
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value as typeof viewMode)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="overview">Vue d'ensemble</option>
            <option value="detailed">Vue détaillée</option>
            {isAdmin && <option value="processing">Traitement</option>}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {/* Stats Cards */}
        <StatsCards 
          linkedinMessages={stats.linkedin_messages}
          positiveCalls={stats.positive_calls}
          negativeCalls={stats.negative_calls}
          successRate={stats.success_rate}
        />

        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rendez-vous */}
            <SimpleAppointmentsCard />
            
            {/* Charts */}
            <DashboardCharts 
              viewType="global"
              timeFilter="7d"
              stats={userComparison}
            />
          </div>
        )}

        {viewMode === 'detailed' && (
          <div className="space-y-6">
            {/* User Stats Table */}
            <UserStatsTable stats={userComparison} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rendez-vous */}
              <SimpleAppointmentsCard />
              
              {/* Charts */}
              <DashboardCharts 
                viewType="global"
                timeFilter="7d"
                stats={userComparison}
              />
            </div>
          </div>
        )}

        {viewMode === 'processing' && isAdmin && (
          <div className="space-y-6">
            {/* Processing Metrics */}
            <ProcessingMetrics timeFilter="24h" />
            
            {/* Diagnostics Panel */}
            <DiagnosticsPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
