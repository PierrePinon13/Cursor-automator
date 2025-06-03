
import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Building, Calendar } from 'lucide-react';
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
      <div className="h-full flex items-center justify-center text-gray-500 bg-gray-50/30">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune activité sélectionnée</h3>
          <p className="text-gray-600">Sélectionnez une activité dans la liste pour voir ses détails</p>
        </div>
      </div>
    );
  }

  const getActivityBadge = () => {
    switch (activity.type) {
      case 'linkedin_message':
        if (activity.message_type === 'connection_request') {
          return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Demande de connexion</Badge>;
        }
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Message LinkedIn</Badge>;
      case 'phone_call':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Appel téléphonique</Badge>;
      default:
        return <Badge variant="secondary">Activité</Badge>;
    }
  };

  const activityDate = new Date(activity.created_at);

  return (
    <div className="h-full bg-white flex flex-col">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b p-4 flex-shrink-0">
        {/* Ligne 1: Prénom nom + LinkedIn */}
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-lg font-semibold text-gray-900">
            {activity.lead_data?.author_name || 'Lead inconnu'}
          </h1>
          
          {activity.lead_data?.author_profile_url && (
            <a 
              href={activity.lead_data.author_profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 hover:scale-110 transition-transform"
            >
              <svg 
                className="h-4 w-4 text-blue-600 hover:text-blue-800" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          )}
        </div>

        {/* Ligne 2: Vignette + Date */}
        <div className="flex items-center gap-3 mb-2">
          {getActivityBadge()}
          <span className="text-sm text-gray-500">
            {format(activityDate, 'dd/MM/yyyy HH:mm', { locale: fr })}
          </span>
        </div>

        {/* Ligne 3: Par + utilisateur */}
        <div className="mb-0">
          <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
            Par {activity.sender_name}
          </Badge>
        </div>
      </div>

      {/* Séparateur */}
      <Separator />

      {/* Message envoyé si disponible */}
      {activity.message_content && (
        <div className="bg-blue-50/30 border-b p-4 flex-shrink-0">
          <div className="bg-white rounded-lg p-4 border border-blue-100 max-w-md shadow-sm">
            <div className="text-xs text-blue-600 font-medium mb-3">Message envoyé</div>
            <ScrollArea className="max-h-32">
              <div className="text-sm text-gray-900 leading-relaxed pr-3 whitespace-pre-wrap">
                {activity.message_content}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Contenu principal : Informations du lead */}
      <div className="flex-1 p-6 bg-slate-50/20 space-y-4">
        
        {/* Section Entreprise avec icône */}
        {activity.lead_data?.company_name && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <div className="text-base font-semibold text-gray-900">
                  {activity.lead_data?.company_position && (
                    <span>{activity.lead_data.company_position} @ </span>
                  )}
                  {activity.lead_data.company_name}
                </div>
                {activity.lead_data?.matched_client_name && (
                  <div className="text-sm text-purple-700 font-medium mt-1">
                    Client associé : {activity.lead_data.matched_client_name}
                  </div>
                )}
              </div>
            </div>
            
            {/* Éléments clés disponibles seulement si on a des infos */}
            {(activity.lead_data.company_name) && (
              <div className="ml-8 text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
                Secteur d'activité, taille, localisation et autres informations détaillées disponibles
              </div>
            )}
          </div>
        )}

        {/* Détails temporels - section jaune pâle uniquement */}
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-gray-900">Chronologie</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900">Date :</span>
              <p className="text-gray-700">{format(activityDate, 'dd/MM/yyyy', { locale: fr })}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Heure :</span>
              <p className="text-gray-700">{format(activityDate, 'HH:mm', { locale: fr })}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Il y a :</span>
              <p className="text-gray-700">{formatDistanceToNow(activityDate, { addSuffix: true, locale: fr })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetail;
