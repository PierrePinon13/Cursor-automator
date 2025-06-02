
import { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import { useDashboardStats, TimeRange, UserSelection } from '@/hooks/useDashboardStats';
import { useUsers } from '@/hooks/useUsers';
import { UserSelector } from '@/components/dashboard/UserSelector';
import { TimeRangeSelector } from '@/components/dashboard/TimeRangeSelector';
import StatsCards from '@/components/dashboard/StatsCards';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import UserStatsTable from '@/components/dashboard/UserStatsTable';

const Dashboard = () => {
  // États pour les filtres
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end, label: 'Cette semaine' };
  });

  const [userSelection, setUserSelection] = useState<UserSelection>({
    type: 'personal'
  });

  // Hooks
  const { data, loading, fetchStats } = useDashboardStats();
  const { users } = useUsers();

  // Charger les données quand les filtres changent
  useEffect(() => {
    fetchStats(timeRange, userSelection);
  }, [timeRange, userSelection, fetchStats]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
        </div>
        <UserActionsDropdown />
      </div>

      <div className="p-6 space-y-6">
        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-4">
          <UserSelector
            users={users}
            selection={userSelection}
            onSelectionChange={setUserSelection}
          />
          <TimeRangeSelector
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Actualisation...
            </div>
          )}
        </div>

        {/* Contenu principal */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="evolution">Évolution</TabsTrigger>
            <TabsTrigger value="comparison">Comparaison</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {data && (
              <>
                <StatsCards
                  linkedinMessages={data.stats.linkedin_messages}
                  positiveCalls={data.stats.positive_calls}
                  negativeCalls={data.stats.negative_calls}
                  successRate={data.stats.success_rate}
                />
                
                {userSelection.type === 'specific' && data.userComparison && (
                  <UserStatsTable 
                    stats={data.userComparison.map(u => ({
                      user_id: u.user_id,
                      user_email: u.user_email,
                      linkedin_messages_sent: u.stats.linkedin_messages,
                      positive_calls: u.stats.positive_calls,
                      negative_calls: u.stats.negative_calls,
                    }))}
                  />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="evolution" className="space-y-6">
            {data && (
              <DashboardCharts
                viewType={userSelection.type === 'specific' ? 'comparison' : 'global'}
                timeFilter="all"
                stats={data.evolution.map(e => ({
                  user_id: 'system',
                  user_email: 'System',
                  stat_date: e.date,
                  linkedin_messages_sent: e.linkedin_messages,
                  positive_calls: e.positive_calls,
                  negative_calls: e.negative_calls,
                }))}
              />
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            {data?.userComparison && (
              <UserStatsTable 
                stats={data.userComparison.map(u => ({
                  user_id: u.user_id,
                  user_email: u.user_email,
                  linkedin_messages_sent: u.stats.linkedin_messages,
                  positive_calls: u.stats.positive_calls,
                  negative_calls: u.stats.negative_calls,
                }))}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
