
import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import StatsFilters from '@/components/dashboard/StatsFilters';
import StatsCards from '@/components/dashboard/StatsCards';
import UserStatsTable from '@/components/dashboard/UserStatsTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStats, TimeFilter, ViewType } from '@/hooks/useUserStats';

const Dashboard = () => {
  const [viewType, setViewType] = useState<ViewType>('personal');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this-week');
  const { stats, aggregatedStats, loading, fetchStats } = useUserStats();

  useEffect(() => {
    fetchStats(viewType, timeFilter);
  }, [viewType, timeFilter]);

  const handleViewTypeChange = (value: string) => {
    if (value) {
      setViewType(value as ViewType);
    }
  };

  const handleTimeFilterChange = (value: TimeFilter) => {
    setTimeFilter(value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="p-6 space-y-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Activité récente</CardTitle>
                  <CardDescription>
                    Dernières actions et performances
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucune activité pour la période sélectionnée
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stats.slice(0, 5).map((stat) => (
                        <div key={`${stat.user_id}-${stat.stat_date}`} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div className="text-sm">
                            {viewType !== 'personal' && (
                              <span className="font-medium">{stat.user_email || 'Utilisateur'} - </span>
                            )}
                            {new Date(stat.stat_date).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {stat.linkedin_messages_sent} msg, {stat.positive_calls + stat.negative_calls} appels
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Résumé de la période</CardTitle>
                  <CardDescription>
                    Vue d'ensemble des performances
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
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
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
