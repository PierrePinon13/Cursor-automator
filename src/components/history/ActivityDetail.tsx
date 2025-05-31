
import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Phone, UserCheck, User, Calendar, Clock, FileText, ExternalLink, PhoneCall } from 'lucide-react';
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

  const getCallStatusIcon = (status: string) => {
    switch (status) {
      case 'positive':
        return <PhoneCall className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <PhoneCall className="h-4 w-4 text-red-600" />;
      default:
        return <PhoneCall className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCallStatusText = (status: string) => {
    switch (status) {
      case 'positive':
        return 'Appel positif';
      case 'negative':
        return 'Appel négatif';
      default:
        return 'Appel neutre';
    }
  };

  const activityDate = new Date(activity.created_at);

  return (
    <div className="h-full p-6 bg-white overflow-y-auto">
      <div className="space-y-6">
        {/* 1. Détails de l'action (quoi, par qui, quand) */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b">
            {getActivityIcon()}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {activity.title}
              </h2>
              <p className="text-sm text-gray-600">
                {activity.message}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Effectué par</p>
              <p className="text-sm text-gray-600">
                {activity.sender_name}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Date et heure</p>
              <p className="text-sm text-gray-600">
                {format(activityDate, 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </p>
              <p className="text-xs text-gray-500">
                ({formatDistanceToNow(activityDate, { addSuffix: true, locale: fr })})
              </p>
            </div>
          </div>
        </div>

        {/* 2. Informations du lead (prénom nom, poste entreprise, lien linkedin) */}
        {activity.lead_data && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-base font-semibold text-gray-900">Informations du lead</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Nom complet</p>
                  <p className="text-sm text-gray-700">
                    {activity.lead_data.author_name || 'Non renseigné'}
                  </p>
                </div>

                {activity.lead_data.company_position && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Poste</p>
                    <p className="text-sm text-gray-700">
                      {activity.lead_data.company_position}
                    </p>
                  </div>
                )}

                {activity.lead_data.company_name && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Entreprise</p>
                    <p className="text-sm text-gray-700">
                      {activity.lead_data.company_name}
                    </p>
                  </div>
                )}

                {activity.lead_data.author_profile_url && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Profil LinkedIn</p>
                    <a 
                      href={activity.lead_data.author_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Voir le profil
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. Message envoyé (pour les messages LinkedIn) */}
        {activity.type === 'linkedin_message' && activity.message_content && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-base font-semibold text-gray-900">Message envoyé</h3>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">
                  {activity.message_type === 'connection_request' ? 'Message de demande de connexion' : 'Message direct'}
                </p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {activity.message_content}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. Informations d'appel téléphonique */}
        {activity.type === 'phone_call' && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-base font-semibold text-gray-900">Détails de l'appel</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3">
                {/* Statut de l'appel avec pictogramme */}
                <div className="flex items-center gap-3">
                  {getCallStatusIcon(activity.lead_data?.phone_contact_status || 'neutral')}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {getCallStatusText(activity.lead_data?.phone_contact_status || 'neutral')}
                    </p>
                  </div>
                </div>

                {/* Numéro de téléphone si disponible */}
                {activity.lead_data?.phone_number && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Numéro appelé</p>
                    <p className="text-sm text-gray-700 font-mono">
                      {activity.lead_data.phone_number}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityDetail;
