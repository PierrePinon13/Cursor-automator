
import DashboardHeader from '@/components/DashboardHeader';
import StatsCards from '@/components/dashboard/StatsCards';
import StatsFilters from '@/components/dashboard/StatsFilters';
import UserStatsTable from '@/components/dashboard/UserStatsTable';
import ProcessingMetrics from '@/components/dashboard/ProcessingMetrics';
import DiagnosticsPanel from '@/components/dashboard/DiagnosticsPanel';
import { useUserStats, ViewType, TimeFilter } from '@/hooks/useUserStats';
import { useProcessingMetrics } from '@/hooks/useProcessingMetrics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  
  const { 
    metrics, 
    loading: metricsLoading 
  } = useProcessingMetrics();

  // Fetch stats when filters change
  useEffect(() => {
    fetchStats(viewType, timeFilter);
  }, [viewType, timeFilter, fetchStats]);

  const handleFiltersChange = (newViewType: ViewType, newTimeFilter: TimeFilter) => {
    setViewType(newViewType);
    setTimeFilter(newTimeFilter);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          </div>
          
          <UserActionsDropdown />
        </div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="processing">Traitement</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats" className="space-y-6">
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
            <UserStatsTable stats={stats} />
          </TabsContent>
          
          <TabsContent value="processing" className="space-y-6">
            <ProcessingMetrics 
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
            />
          </TabsContent>
          
          <TabsContent value="diagnostics" className="space-y-6">
            <DiagnosticsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
