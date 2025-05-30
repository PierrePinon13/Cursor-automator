
import React from 'react';
import { HistoryActivity } from '@/hooks/useHistory';
import { MessageSquare, Phone, Users, TrendingUp } from 'lucide-react';

interface HistoryStatsProps {
  activities: HistoryActivity[];
}

const HistoryStats = ({ activities }: HistoryStatsProps) => {
  const linkedinMessages = activities.filter(a => a.type === 'linkedin_message').length;
  const phoneCalls = activities.filter(a => a.type === 'phone_call').length;
  const uniqueUsers = new Set(activities.map(a => a.sender_name)).size;
  const totalActivities = activities.length;

  const stats = [
    {
      label: 'Messages LinkedIn',
      value: linkedinMessages,
      icon: MessageSquare,
      color: 'text-blue-600'
    },
    {
      label: 'Appels téléphoniques',
      value: phoneCalls,
      icon: Phone,
      color: 'text-green-600'
    },
    {
      label: 'Utilisateurs actifs',
      value: uniqueUsers,
      icon: Users,
      color: 'text-purple-600'
    },
    {
      label: 'Total activités',
      value: totalActivities,
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="bg-white p-4 rounded-lg border mb-4">
      <h3 className="font-medium text-gray-900 mb-3">Statistiques</h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Icon className={`h-4 w-4 ${stat.color}`} />
              <div>
                <div className="text-sm font-medium">{stat.value}</div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryStats;
