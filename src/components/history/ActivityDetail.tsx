
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

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'linkedin_message':
        if (activity.message_type === 'connection_request') {
          return <UserCheck className="h-5 w-5 text-blue-600" />;
        }
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'phone_call':
        return <Phone className="h-5 w-5 text-green-600" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-600" />;
    }
  };

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
    <div className="h-full bg-white p-6 flex flex-col">
      {/* En-tête condensé */}
      <div className="border-b pb-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
            {getActivityIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getActivityBadge()}
              <span className="text-xs text-gray-500">
                {format(activityDate, 'dd/MM/yyyy HH:mm', { locale: fr })}
              </span>
            </div>
            
            <h1 className="text-lg font-semibold text-gray-900 mb-1">
              {activity.title}
            </h1>
            
            <p className="text-sm text-gray-600 leading-relaxed">
              {activity.message}
            </p>
          </div>
        </div>
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
              <div>
                <span className="text-xs text-gray-500">Nom</span>
                <p className="text-sm font-medium text-gray-900">
                  {activity.lead_data?.author_name || 'Non renseigné'}
                </p>
              </div>

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

              {activity.lead_data?.author_profile_url && (
                <div className="pt-1">
                  <a 
                    href={activity.lead_data.author_profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Profil LinkedIn
                  </a>
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
                <span className="text-xs text-gray-500">Par</span>
                <p className="text-sm font-medium text-gray-900">
                  {activity.sender_name}
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

      {/* Message content en bas si disponible */}
      {activity.message_content && (
        <div className="border-t pt-4 mt-4">
          <h4 className="text-xs font-medium text-gray-500 mb-2">
            {activity.message_type === 'connection_request' ? 'Message de connexion' : 'Contenu du message'}
          </h4>
          <div className="bg-gray-50 rounded-lg p-3 max-h-24 overflow-y-auto">
            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
              {activity.message_content}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityDetail;
