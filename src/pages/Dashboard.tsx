
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users } from 'lucide-react';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header moderne */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Aperçu de vos performances</p>
            </div>
          </div>
          <UserActionsDropdown />
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Section filtres modernisée */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Filtres d'analyse
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  <span>Actualisation...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contenu principal avec tabs modernisés */}
        <div className="space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="bg-white shadow-sm border">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Vue d'ensemble
                </TabsTrigger>
                <TabsTrigger value="evolution" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Évolution
                </TabsTrigger>
                <TabsTrigger value="comparison" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Comparaison
                </TabsTrigger>
              </TabsList>
              
              {data && (
                <Badge variant="secondary" className="text-sm">
                  Période: {timeRange.label}
                </Badge>
              )}
            </div>

            <TabsContent value="overview" className="space-y-8 mt-0">
              {data ? (
                <div className="space-y-8">
                  {/* Stats cards */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques clés</h2>
                    <StatsCards
                      linkedinMessages={data.stats.linkedin_messages}
                      positiveCalls={data.stats.positive_calls}
                      negativeCalls={data.stats.negative_calls}
                      successRate={data.stats.success_rate}
                    />
                  </div>
                  
                  {/* Table des utilisateurs si sélection spécifique */}
                  {userSelection.type === 'specific' && data.userComparison && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Performances par collaborateur</h2>
                      <UserStatsTable 
                        stats={data.userComparison.map(u => ({
                          user_id: u.user_id,
                          user_email: u.user_email,
                          linkedin_messages_sent: u.stats.linkedin_messages,
                          positive_calls: u.stats.positive_calls,
                          negative_calls: u.stats.negative_calls,
                        }))}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <CardContent>
                    <div className="text-gray-500">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Aucune donnée disponible</p>
                      <p className="text-sm">Sélectionnez une période avec des données pour voir les statistiques</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="evolution" className="space-y-8 mt-0">
              {data ? (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Évolution temporelle</h2>
                  <DashboardCharts
                    viewType={userSelection.type === 'specific' ? 'comparison' : 'global'}
                    timeFilter="this-week"
                    stats={data.evolution.map(e => ({
                      user_id: 'system',
                      user_email: 'System',
                      stat_date: e.date,
                      linkedin_messages_sent: e.linkedin_messages,
                      positive_calls: e.positive_calls,
                      negative_calls: e.negative_calls,
                    }))}
                  />
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <CardContent>
                    <div className="text-gray-500">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Aucune donnée d'évolution</p>
                      <p className="text-sm">Les graphiques d'évolution apparaîtront ici une fois les données disponibles</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-8 mt-0">
              {data?.userComparison ? (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Comparaison des performances</h2>
                  <UserStatsTable 
                    stats={data.userComparison.map(u => ({
                      user_id: u.user_id,
                      user_email: u.user_email,
                      linkedin_messages_sent: u.stats.linkedin_messages,
                      positive_calls: u.stats.positive_calls,
                      negative_calls: u.stats.negative_calls,
                    }))}
                  />
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <CardContent>
                    <div className="text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Aucune donnée de comparaison</p>
                      <p className="text-sm">Sélectionnez plusieurs utilisateurs pour comparer leurs performances</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
