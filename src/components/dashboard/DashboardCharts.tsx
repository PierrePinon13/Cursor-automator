
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
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
  viewType: 'global' | 'comparison';
  timeFilter: string;
  stats: UserStat[];
}

const DashboardCharts = ({ viewType, timeFilter, stats }: DashboardChartsProps) => {
  // Fonction pour obtenir le nom d'affichage d'un utilisateur
  const getDisplayName = (user: UserStat) => {
    if (!user.user_email) return `User ${user.user_id.slice(0, 8)}`;
    
    const nameFromEmail = user.user_email.split('@')[0];
    const nameParts = nameFromEmail
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    
    return nameParts.join(' ');
  };

  // Préparer les données pour les graphiques
  const { chartData, users, userColors } = useMemo(() => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6366f1'];
    
    if (viewType === 'comparison') {
      // Pour la vue par collaborateur, grouper par date et utilisateur
      const groupedByDate = stats.reduce((acc, stat) => {
        const date = stat.stat_date;
        if (!acc[date]) {
          acc[date] = { date: format(new Date(date), 'dd/MM', { locale: fr }) };
        }
        
        const userKey = getDisplayName(stat);
        acc[date][`${userKey}_linkedin`] = stat.linkedin_messages_sent;
        acc[date][`${userKey}_positive`] = stat.positive_calls;
        acc[date][`${userKey}_negative`] = stat.negative_calls;
        acc[date][`${userKey}_success_rate`] = stat.positive_calls + stat.negative_calls > 0 
          ? (stat.positive_calls / (stat.positive_calls + stat.negative_calls)) * 100 
          : 0;
        
        return acc;
      }, {} as Record<string, any>);

      const chartData = Object.values(groupedByDate)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Obtenir la liste des utilisateurs uniques
      const uniqueUsers = [...new Set(stats.map(stat => getDisplayName(stat)))];
      
      // Assigner des couleurs aux utilisateurs
      const userColors = uniqueUsers.reduce((acc, user, index) => {
        acc[user] = colors[index % colors.length];
        return acc;
      }, {} as Record<string, string>);

      return { chartData, users: uniqueUsers, userColors };
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

      const chartData = Object.entries(groupedByDate)
        .map(([date, data]) => ({
          date: format(new Date(date), 'dd/MM', { locale: fr }),
          linkedin_messages: data.linkedin_messages,
          positive_calls: data.positive_calls,
          negative_calls: data.negative_calls,
          success_rate: data.positive_calls + data.negative_calls > 0 
            ? (data.positive_calls / (data.positive_calls + data.negative_calls)) * 100 
            : 0
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return { chartData, users: [], userColors: {} };
    }
  }, [stats, viewType]);

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

  // Composant de tooltip personnalisé pour afficher le nom complet
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium mb-2">{`Date: ${label}`}</p>
          {payload.map((entry: any, index: number) => {
            // Extraire le nom d'utilisateur de la dataKey
            const dataKey = entry.dataKey;
            let userName = '';
            let metricType = '';
            
            if (dataKey.includes('_linkedin')) {
              userName = dataKey.replace('_linkedin', '');
              metricType = 'Messages LinkedIn';
            } else if (dataKey.includes('_positive')) {
              userName = dataKey.replace('_positive', '');
              metricType = 'Appels positifs';
            } else if (dataKey.includes('_negative')) {
              userName = dataKey.replace('_negative', '');
              metricType = 'Appels négatifs';
            } else if (dataKey.includes('_success_rate')) {
              userName = dataKey.replace('_success_rate', '');
              metricType = 'Taux de réussite (%)';
            } else {
              metricType = entry.name || dataKey;
            }
            
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {userName ? `${userName} - ${metricType}` : metricType}: {entry.value}
                {dataKey.includes('_success_rate') ? '%' : ''}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

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
                <ChartTooltip content={<CustomTooltip />} />
                {viewType === 'comparison' ? (
                  <>
                    {users.map((user) => (
                      <Line
                        key={`${user}_linkedin`}
                        type="monotone"
                        dataKey={`${user}_linkedin`}
                        stroke={userColors[user]}
                        strokeWidth={2}
                        name={user}
                        connectNulls={false}
                      />
                    ))}
                    <ChartLegend 
                      content={<ChartLegendContent />} 
                      payload={users.map(user => ({
                        value: user,
                        type: 'line',
                        color: userColors[user]
                      }))}
                    />
                  </>
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
                <ChartTooltip content={<CustomTooltip />} />
                {viewType === 'comparison' ? (
                  <>
                    {users.map((user) => (
                      <Line
                        key={`${user}_positive`}
                        type="monotone"
                        dataKey={`${user}_positive`}
                        stroke={userColors[user]}
                        strokeWidth={2}
                        name={user}
                        connectNulls={false}
                      />
                    ))}
                    <ChartLegend 
                      content={<ChartLegendContent />} 
                      payload={users.map(user => ({
                        value: user,
                        type: 'line',
                        color: userColors[user]
                      }))}
                    />
                  </>
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
                <ChartTooltip content={<CustomTooltip />} />
                {viewType === 'comparison' ? (
                  <>
                    {users.map((user) => (
                      <Line
                        key={`${user}_negative`}
                        type="monotone"
                        dataKey={`${user}_negative`}
                        stroke={userColors[user]}
                        strokeWidth={2}
                        name={user}
                        connectNulls={false}
                      />
                    ))}
                    <ChartLegend 
                      content={<ChartLegendContent />} 
                      payload={users.map(user => ({
                        value: user,
                        type: 'line',
                        color: userColors[user]
                      }))}
                    />
                  </>
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
                <ChartTooltip content={<CustomTooltip />} />
                {viewType === 'comparison' ? (
                  <>
                    {users.map((user) => (
                      <Line
                        key={`${user}_success_rate`}
                        type="monotone"
                        dataKey={`${user}_success_rate`}
                        stroke={userColors[user]}
                        strokeWidth={2}
                        name={user}
                        connectNulls={false}
                      />
                    ))}
                    <ChartLegend 
                      content={<ChartLegendContent />} 
                      payload={users.map(user => ({
                        value: user,
                        type: 'line',
                        color: userColors[user]
                      }))}
                    />
                  </>
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
