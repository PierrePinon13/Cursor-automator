
import StatsCards from '@/components/dashboard/StatsCards';
import StatsFilters from '@/components/dashboard/StatsFilters';
import UserStatsTable from '@/components/dashboard/UserStatsTable';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { useUserStats, ViewType, TimeFilter } from '@/hooks/useUserStats';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import { useState, useEffect } from 'react';

const Dashboard = () => {
  const [viewType, setViewType] = useState<ViewType>('personal');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this-week');
  
  const { 
    stats, 
    aggregatedStats,
    loading: statsLoading, 
    fetchStats 
  } = useUserStats();

  // Fetch stats when filters change
  useEffect(() => {
    fetchStats(viewType, timeFilter);
  }, [viewType, timeFilter, fetchStats]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header minimal avec juste les boutons de navigation */}
      <div className="flex items-center justify-between px-3 py-2 bg-white">
        <SidebarTrigger />
        <UserActionsDropdown />
      </div>

      <div className="p-6 space-y-6">
        <StatsFilters 
          viewType={viewType}
          timeFilter={timeFilter}
          onViewTypeChange={setViewType}
          onTimeFilterChange={setTimeFilter}
        />
        
        <StatsCards 
          linkedinMessages={aggregatedStats.linkedin_messages_sent}
          positiveCalls={aggregatedStats.positive_calls}
          negativeCalls={aggregatedStats.negative_calls}
          successRate={aggregatedStats.success_rate}
        />

        <DashboardCharts 
          viewType={viewType}
          timeFilter={timeFilter}
          stats={stats}
        />
        
        {viewType === 'comparison' && (
          <UserStatsTable stats={stats} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
