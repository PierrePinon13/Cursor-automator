import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageSquare, Phone, PhoneOff, UserPlus, Target } from 'lucide-react';
import { useUserStats } from '@/hooks/useUserStats';
import { useLeadAssignments } from '@/hooks/useLeadAssignments';
import ActivityLogSheet from './ActivityLogSheet';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Activity {
  id: string;
  type: 'stats' | 'assignment' | 'lead_action';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

const RecentActivityPreview = () => {
  const { stats, loading: statsLoading } = useUserStats();
  const { assignments, loading: assignmentsLoading } = useLeadAssignments();
  const { user } = useAuth();
  const [showFullLog, setShowFullLog] = useState(false);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllActivities = async () => {
      if (!user) return;

      try {
        const activities: Activity[] = [];

        // Ajouter les statistiques d'activité
        stats.slice(0, 10).forEach(stat => {
          const activities_parts = [];
          if (stat.linkedin_messages_sent > 0) {
            activities_parts.push(`${stat.linkedin_messages_sent} message${stat.linkedin_messages_sent > 1 ? 's' : ''} LinkedIn`);
          }
          if (stat.positive_calls > 0) {
            activities_parts.push(`${stat.positive_calls} appel${stat.positive_calls > 1 ? 's' : ''} positif${stat.positive_calls > 1 ? 's' : ''}`);
          }
          if (stat.negative_calls > 0) {
            activities_parts.push(`${stat.negative_calls} appel${stat.negative_calls > 1 ? 's' : ''} négatif${stat.negative_calls > 1 ? 's' : ''}`);
          }

          if (activities_parts.length > 0) {
            activities.push({
              id: `stat-${stat.user_id}-${stat.stat_date}`,
              type: 'stats',
              title: 'Activité commerciale',
              description: activities_parts.join(' • '),
              timestamp: stat.stat_date,
              icon: stat.linkedin_messages_sent > 0 ? 
                <MessageSquare className="h-4 w-4 text-blue-500" /> :
                stat.positive_calls > 0 ? 
                <Phone className="h-4 w-4 text-green-500" /> :
                <PhoneOff className="h-4 w-4 text-red-500" />
            });
          }
        });

        // Ajouter les assignations de leads
        const userAssignments = assignments.filter(assignment => assignment.user_id === user.id);
        for (const assignment of userAssignments.slice(0, 5)) {
          // Récupérer les détails du lead
          const { data: leadData } = await supabase
            .from('linkedin_posts')
            .select('author_name, matched_client_name, unipile_position')
            .eq('id', assignment.lead_id)
            .single();

          if (leadData) {
            activities.push({
              id: `assignment-${assignment.id}`,
              type: 'assignment',
              title: 'Lead assigné',
              description: `${leadData.author_name} - ${leadData.unipile_position || 'Poste non spécifié'}`,
              timestamp: assignment.assigned_at,
              icon: <UserPlus className="h-4 w-4 text-purple-500" />
            });
          }
        }

        // Récupérer les actions récentes sur les leads (messages LinkedIn, appels, etc.)
        const { data: leadActions } = await supabase
          .from('linkedin_posts')
          .select(`
            id,
            author_name,
            unipile_position,
            linkedin_message_sent_at,
            phone_contact_at,
            phone_contact_status,
            last_contact_at
          `)
          .or(`linkedin_message_sent_at.is.not.null,phone_contact_at.is.not.null`)
          .order('last_contact_at', { ascending: false })
          .limit(10);

        if (leadActions) {
          leadActions.forEach(lead => {
            if (lead.linkedin_message_sent_at) {
              activities.push({
                id: `linkedin-${lead.id}`,
                type: 'lead_action',
                title: 'Message LinkedIn envoyé',
                description: `À ${lead.author_name} - ${lead.unipile_position || 'Poste non spécifié'}`,
                timestamp: lead.linkedin_message_sent_at,
                icon: <MessageSquare className="h-4 w-4 text-blue-500" />
              });
            }
            if (lead.phone_contact_at) {
              activities.push({
                id: `phone-${lead.id}`,
                type: 'lead_action',
                title: `Appel ${lead.phone_contact_status === 'positive' ? 'positif' : 'négatif'}`,
                description: `Avec ${lead.author_name} - ${lead.unipile_position || 'Poste non spécifié'}`,
                timestamp: lead.phone_contact_at,
                icon: lead.phone_contact_status === 'positive' ? 
                  <Phone className="h-4 w-4 text-green-500" /> : 
                  <PhoneOff className="h-4 w-4 text-red-500" />
              });
            }
          });
        }

        // Trier toutes les activités par date (plus récentes en premier)
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setAllActivities(activities.slice(0, 8));
      } catch (error) {
        console.error('Erreur lors de la récupération des activités:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!statsLoading && !assignmentsLoading) {
      fetchAllActivities();
    }
  }, [stats, assignments, user, statsLoading, assignmentsLoading]);

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Chargement des activités...
      </div>
    );
  }

  if (allActivities.length === 0) {
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
          {allActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="mt-1">
                {activity.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900">
                  {activity.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activity.timestamp), { 
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
