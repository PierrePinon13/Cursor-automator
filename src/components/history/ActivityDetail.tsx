
import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Phone, UserCheck, User, Calendar, Clock, FileText, Building, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    <div className="h-full bg-gray-50/30 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* En-tête avec icône, titre et badge */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gray-100 rounded-lg flex-shrink-0">
              {getActivityIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                {getActivityBadge()}
                <span className="text-sm text-gray-500">
                  {format(activityDate, 'dd MMMM yyyy', { locale: fr })} à {format(activityDate, 'HH:mm', { locale: fr })}
                </span>
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                {activity.title}
              </h1>
              
              <p className="text-gray-600">
                {activity.message}
              </p>
            </div>
          </div>
        </div>

        {/* Informations temporelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Informations temporelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p className="text-sm text-gray-900 mt-1">
                  {format(activityDate, 'EEEE dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Heure</label>
                <p className="text-sm text-gray-900 mt-1">
                  {format(activityDate, 'HH:mm', { locale: fr })}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Il y a</label>
                <p className="text-sm text-gray-900 mt-1">
                  {formatDistanceToNow(activityDate, { addSuffix: true, locale: fr })}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Utilisateur</label>
                <p className="text-sm text-gray-900 mt-1">
                  {activity.sender_name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations sur le contact */}
        {activity.lead_data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Informations du contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nom</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {activity.lead_data.author_name || 'Non renseigné'}
                  </p>
                </div>

                {activity.lead_data.company_position && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Poste</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {activity.lead_data.company_position}
                    </p>
                  </div>
                )}

                {activity.lead_data.company_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Entreprise</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Building className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-900">
                        {activity.lead_data.company_name}
                      </p>
                    </div>
                  </div>
                )}

                {activity.lead_data.matched_client_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Client associé</label>
                    <p className="text-sm text-gray-900 mt-1 font-medium">
                      {activity.lead_data.matched_client_name}
                    </p>
                  </div>
                )}
              </div>

              {activity.lead_data.author_profile_url && (
                <Separator />
              )}

              {activity.lead_data.author_profile_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Profil LinkedIn</label>
                  <div className="mt-2">
                    <a 
                      href={activity.lead_data.author_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Voir le profil LinkedIn
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Détails de l'activité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Détails de l'activité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Type d'action</label>
              <p className="text-sm text-gray-900 mt-1">
                {activity.type === 'linkedin_message' 
                  ? (activity.message_type === 'connection_request' ? 'Demande de connexion LinkedIn' : 'Message direct LinkedIn')
                  : 'Appel téléphonique'
                }
              </p>
            </div>

            {/* Contenu du message si disponible */}
            {activity.message_content && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {activity.message_type === 'connection_request' ? 'Message de la demande de connexion' : 'Contenu du message'}
                  </label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {activity.message_content}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityDetail;
