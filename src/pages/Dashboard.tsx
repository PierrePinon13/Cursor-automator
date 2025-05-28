import { useState, useEffect } from 'react';
import StatsFilters from '@/components/dashboard/StatsFilters';
import StatsCards from '@/components/dashboard/StatsCards';
import UserStatsTable from '@/components/dashboard/UserStatsTable';
import ProcessingMetrics from '@/components/dashboard/ProcessingMetrics';
import DiagnosticsPanel from '@/components/dashboard/DiagnosticsPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserStats, TimeFilter, ViewType } from '@/hooks/useUserStats';

const Dashboard = () => {
  const [viewType, setViewType] = useState<ViewType>('personal');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this-week');
  const { stats, aggregatedStats, loading, fetchStats } = useUserStats();

  console.log('Dashboard - Current state:', { viewType, timeFilter, loading });
  console.log('Dashboard - Stats:', stats);
  console.log('Dashboard - Aggregated:', aggregatedStats);

  useEffect(() => {
    console.log('Dashboard - Fetching stats on mount or filter change');
    fetchStats(viewType, timeFilter);
  }, [viewType, timeFilter]);

  const handleViewTypeChange = (value: string) => {
    if (value) {
      console.log('Dashboard - View type changed to:', value);
      setViewType(value as ViewType);
    }
  };

  const handleTimeFilterChange = (value: TimeFilter) => {
    console.log('Dashboard - Time filter changed to:', value);
    setTimeFilter(value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Tableau de bord</h2>
          <p className="text-muted-foreground">
            Suivi des performances et des statistiques d'activité
          </p>
        </div>

        <StatsFilters
          viewType={viewType}
          timeFilter={timeFilter}
          onViewTypeChange={handleViewTypeChange}
          onTimeFilterChange={handleTimeFilterChange}
        />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full lg:w-[400px] grid-cols-2">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="processing">Pipeline LinkedIn</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Chargement des statistiques...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <StatsCards
                  linkedinMessages={aggregatedStats.linkedin_messages_sent}
                  positiveCalls={aggregatedStats.positive_calls}
                  negativeCalls={aggregatedStats.negative_calls}
                  successRate={aggregatedStats.success_rate}
                />

                {viewType === 'comparison' && stats.length > 0 && (
                  <UserStatsTable stats={stats} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Résumé de la période</CardTitle>
                      <CardDescription className="text-sm">
                        Vue d'ensemble des performances ({timeFilter})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Messages LinkedIn totaux</span>
                        <span className="font-medium">{aggregatedStats.linkedin_messages_sent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Appels totaux</span>
                        <span className="font-medium">{aggregatedStats.total_calls}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Taux de conversion</span>
                        <span className="font-medium">{aggregatedStats.success_rate.toFixed(1)}%</span>
                      </div>
                      {viewType !== 'personal' && stats.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Utilisateurs actifs</span>
                          <span className="font-medium">{new Set(stats.map(s => s.user_id)).size}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Activité récente</CardTitle>
                      <CardDescription className="text-sm">
                        Dernières actions et performances
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stats.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                          {loading ? 'Chargement...' : 'Aucune activité pour la période sélectionnée'}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {stats.slice(0, 8).map((stat) => (
                            <div key={`${stat.user_id}-${stat.stat_date}`} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                              <div className="space-y-1">
                                <div className="text-sm font-medium">
                                  {viewType !== 'personal' && (
                                    <span className="text-blue-600">{stat.user_email || 'Utilisateur'}</span>
                                  )}
                                  {viewType === 'personal' && (
                                    <span>Activité du {new Date(stat.stat_date).toLocaleDateString('fr-FR')}</span>
                                  )}
                                </div>
                                {viewType !== 'personal' && (
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(stat.stat_date).toLocaleDateString('fr-FR')}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {stat.linkedin_messages_sent} msg • {stat.positive_calls + stat.negative_calls} appels
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {stat.positive_calls} positifs • {stat.negative_calls} négatifs
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="processing" className="space-y-6">
            <ProcessingMetrics timeFilter={timeFilter} />
            <DiagnosticsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
