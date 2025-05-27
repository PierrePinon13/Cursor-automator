
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageSquare, Phone, PhoneOff } from 'lucide-react';
import { useUserStats } from '@/hooks/useUserStats';
import ActivityLogSheet from './ActivityLogSheet';
import { useState } from 'react';

const RecentActivityPreview = () => {
  const { stats, loading } = useUserStats();
  const [showFullLog, setShowFullLog] = useState(false);

  // Prendre seulement les 5 dernières activités pour l'aperçu
  const recentStats = stats.slice(0, 5);

  const getActivityIcon = (stat: any) => {
    if (stat.linkedin_messages_sent > 0) return <MessageSquare className="h-3 w-3 text-blue-500" />;
    if (stat.positive_calls > 0) return <Phone className="h-3 w-3 text-green-500" />;
    if (stat.negative_calls > 0) return <PhoneOff className="h-3 w-3 text-red-500" />;
    return <div className="h-3 w-3 bg-gray-300 rounded-full" />;
  };

  const getActivityDescription = (stat: any) => {
    const activities = [];
    if (stat.linkedin_messages_sent > 0) {
      activities.push(`${stat.linkedin_messages_sent} message${stat.linkedin_messages_sent > 1 ? 's' : ''} LinkedIn`);
    }
    if (stat.positive_calls > 0) {
      activities.push(`${stat.positive_calls} appel${stat.positive_calls > 1 ? 's' : ''} positif${stat.positive_calls > 1 ? 's' : ''}`);
    }
    if (stat.negative_calls > 0) {
      activities.push(`${stat.negative_calls} appel${stat.negative_calls > 1 ? 's' : ''} négatif${stat.negative_calls > 1 ? 's' : ''}`);
    }
    return activities.join(' • ') || 'Aucune activité';
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Chargement des activités...
      </div>
    );
  }

  if (recentStats.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Aucune activité récente
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="max-h-80">
        <div className="p-3 space-y-3">
          {recentStats.map((stat, index) => (
            <div key={`${stat.user_id}-${stat.stat_date}-${index}`} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="mt-1">
                {getActivityIcon(stat)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900">
                  {getActivityDescription(stat)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(stat.stat_date), { 
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
              onClick={() => setShowFullLog(true)}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Voir le journal complet
            </Button>
          </div>
        </div>
      </ScrollArea>

      <ActivityLogSheet 
        open={showFullLog} 
        onOpenChange={setShowFullLog}
      />
    </>
  );
};

export default RecentActivityPreview;
