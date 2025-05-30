
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ViewType, TimeFilter } from '@/hooks/useUserStats';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserStat {
  user_id: string;
  user_email?: string;
  stat_date: string;
  linkedin_messages_sent: number;
  positive_calls: number;
  negative_calls: number;
}

interface DashboardChartsProps {
  viewType: ViewType;
  timeFilter: TimeFilter;
  stats: UserStat[];
}

const DashboardCharts = ({ viewType, timeFilter, stats }: DashboardChartsProps) => {
  // Préparer les données pour les graphiques
  const chartData = useMemo(() => {
    if (viewType === 'comparison') {
      // Pour la vue par collaborateur, grouper par date et utilisateur
      const groupedByDate = stats.reduce((acc, stat) => {
        const date = stat.stat_date;
        if (!acc[date]) {
          acc[date] = {};
        }
        
        const userKey = stat.user_email || `User ${stat.user_id.slice(0, 8)}`;
        acc[date][userKey] = {
          linkedin_messages: stat.linkedin_messages_sent,
          positive_calls: stat.positive_calls,
          negative_calls: stat.negative_calls,
          total_calls: stat.positive_calls + stat.negative_calls,
          success_rate: stat.positive_calls + stat.negative_calls > 0 
            ? (stat.positive_calls / (stat.positive_calls + stat.negative_calls)) * 100 
            : 0
        };
        
        return acc;
      }, {} as Record<string, Record<string, any>>);

      return Object.entries(groupedByDate)
        .map(([date, users]) => ({
          date: format(new Date(date), 'dd/MM', { locale: fr }),
          ...users
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      // Pour les vues personnelle et globale, agréger par date
      const groupedByDate = stats.reduce((acc, stat) => {
        const date = stat.stat_date;
        if (!acc[date]) {
          acc[date] = {
            linkedin_messages: 0,
            positive_calls: 0,
            negative_calls: 0
          };
        }
        
        acc[date].linkedin_messages += stat.linkedin_messages_sent;
        acc[date].positive_calls += stat.positive_calls;
        acc[date].negative_calls += stat.negative_calls;
        
        return acc;
      }, {} as Record<string, any>);

      return Object.entries(groupedByDate)
        .map(([date, data]) => ({
          date: format(new Date(date), 'dd/MM', { locale: fr }),
          linkedin_messages: data.linkedin_messages,
          positive_calls: data.positive_calls,
          negative_calls: data.negative_calls,
          total_calls: data.positive_calls + data.negative_calls,
          success_rate: data.positive_calls + data.negative_calls > 0 
            ? (data.positive_calls / (data.positive_calls + data.negative_calls)) * 100 
            : 0
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }, [stats, viewType]);

  // Obtenir la liste des utilisateurs pour les courbes multiples
  const users = useMemo(() => {
    if (viewType !== 'comparison') return [];
    
    const userSet = new Set<string>();
    stats.forEach(stat => {
      const userKey = stat.user_email || `User ${stat.user_id.slice(0, 8)}`;
      userSet.add(userKey);
    });
    
    return Array.from(userSet);
  }, [stats, viewType]);

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'];

  const chartConfig = {
    linkedin_messages: {
      label: 'Messages LinkedIn',
      color: '#3b82f6',
    },
    positive_calls: {
      label: 'Appels positifs',
      color: '#10b981',
    },
    negative_calls: {
      label: 'Appels négatifs',
      color: '#ef4444',
    },
    success_rate: {
      label: 'Taux de réussite (%)',
      color: '#8b5cf6',
    },
  };

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune donnée disponible pour la période sélectionnée
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Messages LinkedIn */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Messages LinkedIn</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                {viewType === 'comparison' ? (
                  users.map((user, index) => (
                    <Line
                      key={user}
                      type="monotone"
                      dataKey={`${user}.linkedin_messages`}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      name={user}
                    />
                  ))
                ) : (
                  <Line
                    type="monotone"
                    dataKey="linkedin_messages"
                    stroke={chartConfig.linkedin_messages.color}
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Appels positifs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appels positifs</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                {viewType === 'comparison' ? (
                  users.map((user, index) => (
                    <Line
                      key={user}
                      type="monotone"
                      dataKey={`${user}.positive_calls`}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      name={user}
                    />
                  ))
                ) : (
                  <Line
                    type="monotone"
                    dataKey="positive_calls"
                    stroke={chartConfig.positive_calls.color}
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Appels négatifs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appels négatifs</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                {viewType === 'comparison' ? (
                  users.map((user, index) => (
                    <Line
                      key={user}
                      type="monotone"
                      dataKey={`${user}.negative_calls`}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      name={user}
                    />
                  ))
                ) : (
                  <Line
                    type="monotone"
                    dataKey="negative_calls"
                    stroke={chartConfig.negative_calls.color}
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Taux de réussite */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Taux de réussite</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {viewType === 'comparison' ? (
                  users.map((user, index) => (
                    <Line
                      key={user}
                      type="monotone"
                      dataKey={`${user}.success_rate`}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      name={user}
                    />
                  ))
                ) : (
                  <Line
                    type="monotone"
                    dataKey="success_rate"
                    stroke={chartConfig.success_rate.color}
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCharts;
