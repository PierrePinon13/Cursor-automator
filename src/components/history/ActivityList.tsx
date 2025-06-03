
import React, { useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Phone, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HistoryActivity } from '@/hooks/useHistory';

interface ActivityListProps {
  activities: HistoryActivity[];
  selectedActivity: HistoryActivity | null;
  onSelectActivity: (activity: HistoryActivity) => void;
}

const ActivityList = ({ 
  activities, 
  selectedActivity, 
  onSelectActivity
}: ActivityListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  console.log('📋 ActivityList - received activities:', activities.length);

  const getActivityIcon = (activity: HistoryActivity) => {
    switch (activity.type) {
      case 'linkedin_message':
        // Différencier demande de connexion vs message direct
        if (activity.message_type === 'connection_request') {
          return <UserCheck className="h-4 w-4 text-blue-600" />;
        }
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'phone_call':
        return <Phone className="h-4 w-4 text-green-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  // Gestion de l'état de chargement et des données vides
  if (activities.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 min-h-[200px] flex items-center justify-center">
        <div>
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>Aucune activité trouvée dans l'historique</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="divide-y divide-gray-100 h-full overflow-y-auto max-h-[calc(100vh-200px)]"
    >
      {activities.map((activity, index) => {
        console.log(`📝 Rendering activity ${index + 1}:`, activity.id, activity.type, 'message_type:', activity.message_type);
        
        // Nom du lead avec fallback intelligent
        const leadName = activity.lead_data?.author_name || 'Contact inconnu';
        const leadPosition = activity.lead_data?.company_position || activity.lead_data?.unipile_position;
        const leadCompany = activity.lead_data?.company_name || activity.lead_data?.unipile_company;
        
        return (
          <div
            key={activity.id}
            onClick={() => onSelectActivity(activity)}
            className={cn(
              'p-3 cursor-pointer hover:bg-gray-50 transition-colors',
              selectedActivity?.id === activity.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">
                    {activity.title}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {leadName}
                </p>
                {(leadPosition || leadCompany) && (
                  <p className="text-xs text-gray-600 truncate">
                    {leadPosition}{leadPosition && leadCompany ? ' @ ' : ''}{leadCompany}
                  </p>
                )}
                <p className="text-xs text-gray-600 truncate mt-1">
                  {activity.message}
                </p>
                {/* Affichage du nom de l'utilisateur qui a fait l'action */}
                {activity.sender_name && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    Par {activity.sender_name}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.created_at), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityList;
