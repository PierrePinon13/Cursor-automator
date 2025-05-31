
import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Phone, UserCheck, User, Calendar, Clock, FileText } from 'lucide-react';
import { HistoryActivity } from '@/hooks/useHistory';

interface ActivityDetailProps {
  activity: HistoryActivity | null;
}

const ActivityDetail = ({ activity }: ActivityDetailProps) => {
  if (!activity) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>Sélectionnez une activité pour voir les détails</p>
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

  const activityDate = new Date(activity.created_at);

  return (
    <div className="h-full p-6 bg-white">
      <div className="space-y-6">
        {/* En-tête avec icône et titre */}
        <div className="flex items-center gap-3 pb-4 border-b">
          {getActivityIcon()}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {activity.title}
            </h2>
            <p className="text-sm text-gray-600">
              Détail de l'activité
            </p>
          </div>
        </div>

        {/* Informations temporelles */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Date</p>
              <p className="text-sm text-gray-600">
                {format(activityDate, 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Heure</p>
              <p className="text-sm text-gray-600">
                {format(activityDate, 'HH:mm', { locale: fr })} ({formatDistanceToNow(activityDate, { addSuffix: true, locale: fr })})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Utilisateur</p>
              <p className="text-sm text-gray-600">
                {activity.sender_name}
              </p>
            </div>
          </div>
        </div>

        {/* Informations sur le lead */}
        {activity.lead_data && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
            
            <div>
              <p className="text-sm font-medium text-gray-900">Nom</p>
              <p className="text-sm text-gray-600">
                {activity.lead_data.author_name || 'Non renseigné'}
              </p>
            </div>

            {activity.lead_data.company_position && (
              <div>
                <p className="text-sm font-medium text-gray-900">Poste</p>
                <p className="text-sm text-gray-600">
                  {activity.lead_data.company_position}
                </p>
              </div>
            )}

            {activity.lead_data.company_name && (
              <div>
                <p className="text-sm font-medium text-gray-900">Entreprise</p>
                <p className="text-sm text-gray-600">
                  {activity.lead_data.company_name}
                </p>
              </div>
            )}

            {activity.lead_data.author_profile_url && (
              <div>
                <p className="text-sm font-medium text-gray-900">Profil LinkedIn</p>
                <a 
                  href={activity.lead_data.author_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Voir le profil
                </a>
              </div>
            )}
          </div>
        )}

        {/* Détails du message */}
        <div className="space-y-3 pt-4 border-t">
          <h3 className="text-sm font-semibold text-gray-900">Détails de l'activité</h3>
          
          <div>
            <p className="text-sm font-medium text-gray-900">Action</p>
            <p className="text-sm text-gray-600">
              {activity.message}
            </p>
          </div>

          {activity.type === 'linkedin_message' && activity.message_type && (
            <div>
              <p className="text-sm font-medium text-gray-900">Type de message</p>
              <p className="text-sm text-gray-600">
                {activity.message_type === 'connection_request' ? 'Demande de connexion' : 'Message direct'}
              </p>
            </div>
          )}

          {/* Affichage du contenu du message si disponible */}
          {activity.message_content && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <p className="text-sm font-medium text-gray-900">
                  {activity.message_type === 'connection_request' ? 'Message de la demande de connexion' : 'Contenu du message'}
                </p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {activity.message_content}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityDetail;
