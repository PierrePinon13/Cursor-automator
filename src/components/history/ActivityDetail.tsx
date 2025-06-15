
import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Building, Calendar, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { HistoryActivity } from '@/hooks/useHistory';

interface ActivityDetailProps {
  activity: HistoryActivity | null;
}

const ActivityDetail = ({ activity }: ActivityDetailProps) => {
  if (!activity) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50/20 to-gray-100/20">
        <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-sm border border-gray-200/60">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune activité sélectionnée</h3>
          <p className="text-gray-600">Sélectionnez une activité dans la liste pour voir ses détails</p>
        </div>
      </div>
    );
  }

  const getActivityBadge = () => {
    switch (activity.type) {
      case 'linkedin_message':
        if (activity.message_type === 'connection_request') {
          return <Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200 font-medium">Demande de connexion</Badge>;
        }
        return <Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200 font-medium">Message LinkedIn</Badge>;
      case 'phone_call':
        return <Badge variant="outline" className="bg-green-50/80 text-green-700 border-green-200 font-medium">Appel téléphonique</Badge>;
      default:
        return <Badge variant="secondary" className="font-medium">Activité</Badge>;
    }
  };

  const activityDate = new Date(activity.created_at);

  return (
    <div className="h-full bg-white/40 backdrop-blur-sm flex flex-col">
      {/* En-tête modernisé avec style cohérent */}
      <div className="bg-gradient-to-r from-slate-50/80 to-gray-50/80 backdrop-blur-sm border-b border-gray-200/60 p-6 flex-shrink-0 shadow-sm">
        {/* Ligne principale : Nom + LinkedIn + Type + Date */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {activity.lead_data?.author_name || 'Lead inconnu'}
            </h1>
            
            {activity.lead_data?.author_profile_url && (
              <a 
                href={activity.lead_data.author_profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-2 rounded-lg bg-blue-50/60 hover:bg-blue-100/60 transition-all duration-200 hover:scale-110"
              >
                <Linkedin className="h-4 w-4 text-blue-600" />
              </a>
            )}

            {getActivityBadge()}
          </div>

          <div className="text-sm text-gray-600 bg-white/60 px-3 py-1 rounded-lg border border-gray-200/60">
            {format(activityDate, 'dd/MM/yyyy HH:mm', { locale: fr })}
          </div>
        </div>

        {/* Ligne "Par" */}
        <div>
          <Badge variant="secondary" className="text-xs bg-emerald-50/80 text-emerald-700 border-emerald-200 font-medium">
            Par {activity.sender_name}
          </Badge>
        </div>
      </div>

      <Separator className="bg-gray-200/60" />

      {/* Section message modernisée */}
      {activity.message_content && (
        <div className="bg-blue-50/20 backdrop-blur-sm border-b border-gray-200/60 p-6 flex-shrink-0">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-blue-200/60 shadow-sm">
            <div className="text-xs text-blue-700 font-semibold mb-3 bg-blue-50/60 px-3 py-1 rounded-full inline-block">
              Message envoyé
            </div>
            <ScrollArea className="max-h-40">
              <div className="text-sm text-gray-900 leading-relaxed pr-3 whitespace-pre-wrap">
                {activity.message_content}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Section informations du lead modernisée */}
      <div className="flex-1 p-6 bg-gradient-to-br from-slate-50/20 to-gray-100/20 space-y-4">
        
        {/* Informations entreprise */}
        {activity.lead_data?.company_name && (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-gray-200/60 shadow-sm">
            <div className="flex items-start gap-4 mb-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-gray-900 mb-1">
                  {activity.lead_data?.company_position && (
                    <span>{activity.lead_data.company_position} @ </span>
                  )}
                  {activity.lead_data.company_name}
                </div>
                {activity.lead_data?.matched_client_name && (
                  <div className="text-sm text-purple-700 font-medium bg-purple-50/60 px-3 py-1 rounded-full inline-block">
                    Client associé : {activity.lead_data.matched_client_name}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-xs text-gray-600 bg-blue-50/60 rounded-lg p-3 border border-blue-200/60">
              Secteur d'activité, taille, localisation et autres informations détaillées disponibles
            </div>
          </div>
        )}

        {/* Chronologie modernisée */}
        <div className="bg-amber-50/60 backdrop-blur-sm rounded-xl p-4 border border-amber-200/60 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100">
              <Calendar className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Chronologie</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-700">
            <div className="bg-white/60 rounded-lg p-2">
              <span className="font-semibold block mb-1">Date:</span> 
              <span>{format(activityDate, 'dd/MM/yyyy', { locale: fr })}</span>
            </div>
            <div className="bg-white/60 rounded-lg p-2">
              <span className="font-semibold block mb-1">Heure:</span> 
              <span>{format(activityDate, 'HH:mm', { locale: fr })}</span>
            </div>
            <div className="bg-white/60 rounded-lg p-2">
              <span className="font-semibold block mb-1">Il y a:</span> 
              <span>{formatDistanceToNow(activityDate, { addSuffix: true, locale: fr })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetail;
