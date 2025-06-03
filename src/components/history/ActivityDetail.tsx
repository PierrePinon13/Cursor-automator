
import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Phone, UserCheck, User, Calendar, Building, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

  const getActivityTitle = () => {
    switch (activity.type) {
      case 'linkedin_message':
        return activity.message_type === 'connection_request' ? 'Demande de connexion' : 'Message LinkedIn';
      case 'phone_call':
        const statusText = activity.message.includes('positif') ? 'positif' : 
                          activity.message.includes('négatif') ? 'négatif' : 'neutre';
        return `Appel ${statusText}`;
      default:
        return 'Activité';
    }
  };

  const getTitleColor = () => {
    switch (activity.type) {
      case 'linkedin_message':
        return 'text-blue-700';
      case 'phone_call':
        return 'text-green-700';
      default:
        return 'text-gray-700';
    }
  };

  const activityDate = new Date(activity.created_at);

  return (
    <div className="h-full bg-white p-6 flex flex-col">
      {/* En-tête restructuré */}
      <div className="border-b pb-4 mb-4">
        {/* Ligne 1: Badge + Nom du lead + LinkedIn */}
        <div className="flex items-center gap-3 mb-2">
          {getActivityBadge()}
          
          <div className="flex items-center gap-2">
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
                  className="h-5 w-5 text-blue-600 hover:text-blue-800" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Ligne 2: Intitulé coloré + Date */}
        <div className="flex items-center gap-3 mb-3">
          <h2 className={`text-base font-medium ${getTitleColor()}`}>
            {getActivityTitle()}
          </h2>
          <span className="text-sm text-gray-500">
            {format(activityDate, 'dd/MM/yyyy HH:mm', { locale: fr })}
          </span>
        </div>

        {/* Ligne 3: Badge de la personne qui a fait l'action */}
        <div className="mb-3">
          <Badge variant="secondary" className="text-xs">
            Par {activity.sender_name}
          </Badge>
        </div>

        {/* Message envoyé si disponible */}
        {activity.message_content && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-900 leading-relaxed">
              {activity.message_content}
            </p>
          </div>
        )}
      </div>

      {/* Contenu principal en deux colonnes */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Colonne gauche : Informations du contact */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact
            </h3>
            
            <div className="space-y-2">
              {activity.lead_data?.company_position && (
                <div>
                  <span className="text-xs text-gray-500">Poste</span>
                  <p className="text-sm text-gray-900">
                    {activity.lead_data.company_position}
                  </p>
                </div>
              )}

              {activity.lead_data?.company_name && (
                <div>
                  <span className="text-xs text-gray-500">Entreprise</span>
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3 text-gray-400" />
                    <p className="text-sm text-gray-900">
                      {activity.lead_data.company_name}
                    </p>
                  </div>
                </div>
              )}

              {activity.lead_data?.matched_client_name && (
                <div>
                  <span className="text-xs text-gray-500">Client associé</span>
                  <p className="text-sm font-medium text-gray-900">
                    {activity.lead_data.matched_client_name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite : Détails de l'activité */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Détails
            </h3>
            
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500">Date complète</span>
                <p className="text-sm text-gray-900">
                  {format(activityDate, 'EEEE dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              
              <div>
                <span className="text-xs text-gray-500">Heure</span>
                <p className="text-sm text-gray-900">
                  {format(activityDate, 'HH:mm', { locale: fr })}
                </p>
              </div>
              
              <div>
                <span className="text-xs text-gray-500">Il y a</span>
                <p className="text-sm text-gray-900">
                  {formatDistanceToNow(activityDate, { addSuffix: true, locale: fr })}
                </p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Type</span>
                <p className="text-sm text-gray-900">
                  {activity.type === 'linkedin_message' 
                    ? (activity.message_type === 'connection_request' ? 'Demande de connexion' : 'Message direct')
                    : 'Appel téléphonique'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetail;
