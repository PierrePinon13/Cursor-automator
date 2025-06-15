
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
      <div className="p-6 text-center min-h-[200px] flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-200/60">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-700 font-medium">Aucune activité trouvée dans l'historique</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="h-full overflow-y-auto max-h-[calc(100vh-200px)] p-2"
    >
      <div className="space-y-2">
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
                'p-4 cursor-pointer rounded-xl transition-all duration-200 border',
                selectedActivity?.id === activity.id 
                  ? 'bg-blue-50/80 border-blue-200 shadow-md transform scale-[1.02]' 
                  : 'bg-white/60 backdrop-blur-sm border-gray-200/60 hover:bg-white/80 hover:shadow-sm hover:border-gray-300/60'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1 p-2 rounded-lg bg-gradient-to-br from-slate-50 to-gray-50">
                  {getActivityIcon(activity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-100/60 px-2 py-1 rounded-full">
                      {activity.title}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate mb-1">
                    {leadName}
                  </p>
                  {(leadPosition || leadCompany) && (
                    <p className="text-xs text-gray-600 truncate mb-2">
                      {leadPosition}{leadPosition && leadCompany ? ' @ ' : ''}{leadCompany}
                    </p>
                  )}
                  <p className="text-xs text-gray-700 truncate mb-2 leading-relaxed">
                    {activity.message}
                  </p>
                  {/* Affichage du nom de l'utilisateur qui a fait l'action */}
                  {activity.sender_name && (
                    <p className="text-xs text-emerald-700 font-medium mb-1 bg-emerald-50/60 px-2 py-1 rounded-full inline-block">
                      Par {activity.sender_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 font-medium">
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
    </div>
  );
};

export default ActivityList;
