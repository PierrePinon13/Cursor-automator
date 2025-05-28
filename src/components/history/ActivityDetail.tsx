
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Phone, UserPlus, Calendar, ExternalLink, Linkedin, User, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Activity {
  id: string;
  type: 'lead_assigned' | 'reminder_due' | 'linkedin_message' | 'phone_call';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  lead_data?: any;
  client_name?: string;
  sender_name?: string;
}

interface ActivityDetailProps {
  activity: Activity | null;
}

const ActivityDetail = ({ activity }: ActivityDetailProps) => {
  if (!activity) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Sélectionnez une activité pour voir les détails</p>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'linkedin_message':
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'phone_call':
        return <Phone className="h-5 w-5 text-green-600" />;
      case 'lead_assigned':
        return <UserPlus className="h-5 w-5 text-purple-600" />;
      case 'reminder_due':
        return <Calendar className="h-5 w-5 text-orange-600" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'linkedin_message':
        return 'Message LinkedIn envoyé';
      case 'phone_call':
        return 'Appel téléphonique';
      case 'lead_assigned':
        return 'Lead assigné';
      case 'reminder_due':
        return 'Rappel programmé';
      default:
        return 'Activité';
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* En-tête de l'activité */}
        <div className="flex items-center gap-3 mb-6">
          {getActivityIcon(activity.type)}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getActivityTypeLabel(activity.type)}
            </h1>
            <p className="text-gray-600">
              {formatDistanceToNow(new Date(activity.created_at), { 
                addSuffix: true, 
                locale: fr 
              })}
            </p>
          </div>
        </div>

        {/* Informations du Lead */}
        {activity.lead_data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Informations du Lead
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {activity.lead_data.author_name}
                    </h3>
                    {activity.lead_data.author_profile_url && (
                      <a
                        href={activity.lead_data.author_profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <p className="text-gray-600 mb-1">{activity.lead_data.unipile_position}</p>
                  <p className="text-gray-600">{activity.lead_data.unipile_company}</p>
                </div>
                
                {/* Poste recherché dans l'encart des informations du lead */}
                {activity.lead_data?.openai_step3_postes_selectionnes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-600" />
                      Poste recherché
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {activity.lead_data.openai_step3_postes_selectionnes.map((poste: string, index: number) => (
                        <Badge key={index} className="bg-green-100 text-green-800 border-green-300 text-xs">
                          {poste}
                        </Badge>
                      ))}
                    </div>
                    {activity.lead_data.url && (
                      <a
                        href={activity.lead_data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                      >
                        Voir la publication LinkedIn
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
                
                {activity.client_name && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Client associé :</p>
                    <p className="font-medium text-gray-900">{activity.client_name}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Détails spécifiques à l'activité */}
        {activity.type === 'linkedin_message' && activity.lead_data?.approach_message && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Message LinkedIn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Contacté par :</span>
                  <span className="font-medium text-gray-800">
                    {activity.sender_name || 'Utilisateur Inconnu'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Date d'envoi :</span>
                  <span className="font-medium text-gray-800">
                    {new Date(activity.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Contenu du message :</h4>
                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {activity.lead_data.approach_message}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activity.type === 'phone_call' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-600" />
                Appel téléphonique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Statut de l'appel :</span>
                  <Badge variant={activity.lead_data?.phone_contact_status === 'positive' ? 'default' : 'secondary'}>
                    {activity.lead_data?.phone_contact_status === 'positive' ? 'Positif' : 'Négatif'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Contacté par :</span>
                  <span className="font-medium text-gray-800">
                    {activity.sender_name || 'Utilisateur Inconnu'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Date de l'appel :</span>
                  <span className="font-medium text-gray-800">
                    {new Date(activity.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ActivityDetail;
