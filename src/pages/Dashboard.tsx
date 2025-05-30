
import DashboardHeader from '@/components/DashboardHeader';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { StatsFilters } from '@/components/dashboard/StatsFilters';
import { UserStatsTable } from '@/components/dashboard/UserStatsTable';
import { ProcessingMetrics } from '@/components/dashboard/ProcessingMetrics';
import { DiagnosticsPanel } from '@/components/dashboard/DiagnosticsPanel';
import { useUserStats } from '@/hooks/useUserStats';
import { useProcessingMetrics } from '@/hooks/useProcessingMetrics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';

const Dashboard = () => {
  const { 
    stats, 
    loading: statsLoading, 
    filters, 
    setFilters 
  } = useUserStats();
  
  const { 
    metrics, 
    loading: metricsLoading 
  } = useProcessingMetrics();

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
            <StatsFilters filters={filters} onFiltersChange={setFilters} />
            <StatsCards stats={stats} loading={statsLoading} />
            <UserStatsTable stats={stats} loading={statsLoading} />
          </TabsContent>
          
          <TabsContent value="processing" className="space-y-6">
            <ProcessingMetrics metrics={metrics} loading={metricsLoading} />
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
