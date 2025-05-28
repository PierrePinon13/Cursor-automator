
import React, { useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Phone, UserPlus, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Activity {
  id: string;
  type: 'lead_assigned' | 'reminder_due' | 'linkedin_message' | 'phone_call';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  lead_data?: any;
}

interface ActivityListProps {
  activities: Activity[];
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity) => void;
  onLoadMore?: () => void;
  canLoadMore?: boolean;
}

const ActivityList = ({ 
  activities, 
  selectedActivity, 
  onSelectActivity, 
  onLoadMore,
  canLoadMore = false
}: ActivityListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  console.log('📋 ActivityList - received activities:', activities.length);
  console.log('🔄 Can load more:', canLoadMore);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'linkedin_message':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'phone_call':
        return <Phone className="h-4 w-4 text-green-600" />;
      case 'lead_assigned':
        return <UserPlus className="h-4 w-4 text-purple-600" />;
      case 'reminder_due':
        return <Calendar className="h-4 w-4 text-orange-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'linkedin_message':
        return 'Message LinkedIn';
      case 'phone_call':
        return 'Appel téléphonique';
      case 'lead_assigned':
        return 'Lead assigné';
      case 'reminder_due':
        return 'Rappel';
      default:
        return 'Activité';
    }
  };

  // Détection du scroll pour charger plus d'activités
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    
    if (isNearBottom && canLoadMore && onLoadMore && !isLoadingMore) {
      console.log('📄 Scroll near bottom, loading more activities');
      setIsLoadingMore(true);
      onLoadMore();
      // Reset loading state after a delay
      setTimeout(() => setIsLoadingMore(false), 500);
    }
  };

  const handleLoadMore = () => {
    if (onLoadMore && !isLoadingMore) {
      console.log('📄 Manual load more triggered');
      setIsLoadingMore(true);
      onLoadMore();
      setTimeout(() => setIsLoadingMore(false), 500);
    }
  };

  if (activities.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Aucune activité trouvée</p>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="divide-y divide-gray-100 h-full overflow-y-auto"
      onScroll={handleScroll}
    >
      {activities.map((activity, index) => {
        console.log(`📝 Rendering activity ${index + 1}:`, activity.id, activity.type);
        return (
          <div
            key={activity.id}
            onClick={() => onSelectActivity(activity)}
            className={cn(
              'p-3 cursor-pointer hover:bg-gray-50 transition-colors',
              selectedActivity?.id === activity.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">
                    {getActivityTypeLabel(activity.type)}
                  </span>
                  {!activity.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.lead_data?.author_name || 'Lead inconnu'}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.created_at), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Indicateur de chargement ou bouton pour charger plus */}
      {canLoadMore && (
        <div className="p-4 text-center border-t">
          {isLoadingMore ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-500">Chargement...</span>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLoadMore}
              className="text-xs"
            >
              Charger plus d'activités
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityList;
