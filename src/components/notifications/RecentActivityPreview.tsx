
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageSquare, Phone, PhoneOff, UserCheck } from 'lucide-react';
import { useHistory } from '@/hooks/useHistory';

interface RecentActivityPreviewProps {
  onViewFullHistory: () => void;
}

const RecentActivityPreview = ({ onViewFullHistory }: RecentActivityPreviewProps) => {
  const { activities, loading } = useHistory();

  const getActivityIcon = (activity: any) => {
    switch (activity.type) {
      case 'linkedin_message':
        if (activity.message_type === 'connection_request') {
          return <UserCheck className="h-4 w-4 text-blue-500" />;
        }
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'phone_call':
        // Déterminer si l'appel était positif ou négatif basé sur le message
        const isPositive = activity.message.includes('positif');
        return isPositive ? 
          <Phone className="h-4 w-4 text-green-500" /> : 
          <PhoneOff className="h-4 w-4 text-red-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Chargement des activités...
      </div>
    );
  }

  const recentActivities = activities.slice(0, 8);

  if (recentActivities.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Aucune activité récente
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-80">
      <div className="p-3 space-y-3">
        {recentActivities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="mt-1">
              {getActivityIcon(activity)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900">
                {activity.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activity.message}
              </p>
              {activity.sender_name && (
                <p className="text-xs text-blue-600 mt-1">
                  Par {activity.sender_name}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(activity.created_at), { 
                  addSuffix: true, 
                  locale: fr 
                })}
              </p>
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={onViewFullHistory}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Voir l'historique complet
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};

export default RecentActivityPreview;
