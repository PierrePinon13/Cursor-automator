
import { useState, useEffect, useMemo } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import { useDashboardStats, TimeRange } from '@/hooks/useDashboardStats';
import { useUsers } from '@/hooks/useUsers';
import { ViewSelector } from '@/components/dashboard/ViewSelector';
import { DisplayModeSelector } from '@/components/dashboard/DisplayModeSelector';
import { TimeRangeSelector } from '@/components/dashboard/TimeRangeSelector';
import StatsCards from '@/components/dashboard/StatsCards';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import UserStatsTable from '@/components/dashboard/UserStatsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type ViewType = 'personal' | 'global' | 'custom';
type DisplayMode = 'stats' | 'evolution';

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

  const [viewType, setViewType] = useState<ViewType>('personal');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('stats');

  // Hooks
  const { data, loading, fetchStats } = useDashboardStats();
  const { users } = useUsers();

  // Mémoriser userSelection pour éviter les re-renders inutiles
  const userSelection = useMemo(() => ({
    type: viewType === 'custom' ? 'specific' as const : viewType,
    userIds: viewType === 'custom' ? selectedUserIds : undefined
  }), [viewType, selectedUserIds]);

  // Charger les données quand les filtres changent (avec debounce implicite via useMemo)
  useEffect(() => {
    let isCancelled = false;
    
    const loadData = async () => {
      try {
        await fetchStats(timeRange, userSelection);
      } catch (error) {
        if (!isCancelled) {
          console.error('Error loading dashboard data:', error);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [timeRange, userSelection, fetchStats]);

  // Composant de chargement amélioré
  const LoadingState = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 ml-auto" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // État de chargement initial
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50">
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
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Filtres d'analyse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>

          <LoadingState />
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
              <ViewSelector
                viewType={viewType}
                selectedUserIds={selectedUserIds}
                users={users}
                onViewTypeChange={setViewType}
                onSelectedUsersChange={setSelectedUserIds}
              />
              
              <TimeRangeSelector
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
              />
              
              <DisplayModeSelector
                mode={displayMode}
                onModeChange={setDisplayMode}
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

        {/* Contenu principal */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {displayMode === 'stats' ? (
                <TrendingUp className="h-5 w-5 text-blue-600" />
              ) : (
                <BarChart3 className="h-5 w-5 text-blue-600" />
              )}
              <h2 className="text-xl font-semibold text-gray-900">
                {displayMode === 'stats' ? 'Statistiques globales' : 'Évolution temporelle'}
              </h2>
            </div>
            
            {data && (
              <Badge variant="secondary" className="text-sm">
                Période: {timeRange.label}
              </Badge>
            )}
          </div>

          {/* Affichage conditionnel stable */}
          {loading ? (
            <LoadingState />
          ) : data && (data.stats.linkedin_messages > 0 || data.stats.positive_calls > 0 || data.stats.negative_calls > 0) ? (
            <div className="space-y-8">
              {displayMode === 'stats' ? (
                <>
                  {/* Stats cards */}
                  <StatsCards
                    linkedinMessages={data.stats.linkedin_messages}
                    positiveCalls={data.stats.positive_calls}
                    negativeCalls={data.stats.negative_calls}
                    successRate={data.stats.success_rate}
                  />
                  
                  {/* Table des utilisateurs si vue globale ou sélection multiple */}
                  {(viewType === 'global' || (viewType === 'custom' && selectedUserIds.length > 1)) && data.userComparison && data.userComparison.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performances par collaborateur</h3>
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
                </>
              ) : (
                <DashboardCharts
                  viewType={viewType === 'custom' ? 'comparison' : 'global'}
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
