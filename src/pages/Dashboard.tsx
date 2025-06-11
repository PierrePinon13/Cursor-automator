
import { useState, useEffect } from 'react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useUserRole } from '@/hooks/useUserRole';
import StatsCards from '@/components/dashboard/StatsCards';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import ProcessingMetrics from '@/components/dashboard/ProcessingMetrics';
import DiagnosticsPanel from '@/components/dashboard/DiagnosticsPanel';
import UserStatsTable from '@/components/dashboard/UserStatsTable';
import AppointmentsSection from '@/components/dashboard/AppointmentsSection';
import { TimeRangeSelector } from '@/components/dashboard/TimeRangeSelector';
import { ViewSelector } from '@/components/dashboard/ViewSelector';
import { useSidebar } from '@/components/ui/sidebar';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'processing'>('overview');
  const { toggleSidebar } = useSidebar();
  const { isAdmin } = useUserRole();
  
  const { data: dashboardData, loading } = useDashboardStats();

  // Get default time range
  const defaultTimeRange = {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    label: '7 derniers jours'
  };

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

  // Extract stats from dashboardData
  const stats = dashboardData?.stats || {
    linkedin_messages: 0,
    positive_calls: 0,
    negative_calls: 0,
    success_rate: 0
  };

  const userComparison = dashboardData?.userComparison || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <CustomSidebarTrigger />
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <TimeRangeSelector 
            timeRange={defaultTimeRange}
            onTimeRangeChange={() => {}}
          />
          <ViewSelector 
            viewType="global"
            selectedUserIds={[]}
            users={[]}
            onViewTypeChange={() => {}}
            onSelectedUsersChange={() => {}}
          />
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
            <AppointmentsSection />
            
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
              <AppointmentsSection />
              
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
