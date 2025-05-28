
import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useSidebar } from '@/components/ui/sidebar';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';
import ActivityList from '@/components/history/ActivityList';
import ActivityDetail from '@/components/history/ActivityDetail';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { User, Users, Linkedin, Phone, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const History = () => {
  const { notifications, refreshNotifications } = useNotifications();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'mine'>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string[]>(['linkedin_message', 'phone_call']);
  const [timeFilter, setTimeFilter] = useState<'1h' | 'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<Date>();
  const [activitiesLimit, setActivitiesLimit] = useState(15);

  console.log('🔍 History component - total notifications:', notifications.length);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Sélectionner automatiquement la première activité si aucune n'est sélectionnée
  useEffect(() => {
    if (!selectedActivity && notifications.length > 0) {
      setSelectedActivity(notifications[0]);
    }
  }, [notifications, selectedActivity]);

  // Filtrer les notifications par période
  const filterByTime = (notification: any) => {
    const notifDate = new Date(notification.created_at);
    const now = new Date();
    
    switch (timeFilter) {
      case '1h':
        return now.getTime() - notifDate.getTime() <= 60 * 60 * 1000;
      case 'today':
        return notifDate.toDateString() === now.toDateString();
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return notifDate.toDateString() === yesterday.toDateString();
      case 'custom':
        return customDate ? notifDate.toDateString() === customDate.toDateString() : true;
      default:
        return true;
    }
  };

  // Filtrer les notifications
  const filteredNotifications = notifications.filter(notification => {
    // Filtre par type d'activité
    if (activityTypeFilter.length > 0 && !activityTypeFilter.includes(notification.type)) {
      return false;
    }
    
    // Filtre par période
    if (!filterByTime(notification)) {
      return false;
    }
    
    // Pour l'instant, on considère toutes les activités comme "miennes"
    // Dans une vraie application, on filtrerait par utilisateur
    return true;
  });

  console.log('📋 Filtered notifications:', filteredNotifications.length);

  // Limiter les activités affichées
  const displayedActivities = filteredNotifications.slice(0, activitiesLimit);
  
  console.log('👁️ Displayed activities:', displayedActivities.length, 'limit:', activitiesLimit);

  // Fonction pour charger plus d'activités
  const loadMoreActivities = () => {
    console.log('📄 Loading more activities, current limit:', activitiesLimit);
    const newLimit = activitiesLimit + 15;
    setActivitiesLimit(newLimit);
  };

  // Vérifier si on peut charger plus d'activités
  const canLoadMore = activitiesLimit < filteredNotifications.length;

  console.log('🔄 Can load more:', canLoadMore, 'limit vs total:', activitiesLimit, 'vs', filteredNotifications.length);

  const getActivityTypeCount = (type: string) => {
    if (type === 'all') return notifications.length;
    return notifications.filter(n => n.type === type).length;
  };

  const handleActivityTypeChange = (values: string[]) => {
    setActivityTypeFilter(values);
  };

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case '1h':
        return 'Dernière heure';
      case 'today':
        return "Aujourd'hui";
      case 'yesterday':
        return 'Hier';
      case 'custom':
        return customDate ? format(customDate, 'dd/MM/yyyy', { locale: fr }) : 'Date personnalisée';
      default:
        return 'Période';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Contenu principal */}
      <div className="flex w-full">
        {/* Sidebar des activités */}
        <div className="w-[24.31rem] bg-white border-r border-gray-200 h-[calc(100vh)] overflow-hidden flex flex-col">
          {/* Header avec trigger sidebar et filtres */}
          <div className="p-4 border-b border-gray-200 space-y-4">
            <CustomSidebarTrigger />
            
            {/* Filtres simplifiés et alignés */}
            <div className="flex items-center gap-3">
              {/* Filtre Utilisateur/Tout le monde */}
              <ToggleGroup 
                type="single" 
                value={filterBy} 
                onValueChange={(value) => value && setFilterBy(value as 'all' | 'mine')}
                className="h-8"
              >
                <ToggleGroupItem 
                  value="mine" 
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <User className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="all" 
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Users className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Filtre Type d'activité */}
              <ToggleGroup 
                type="multiple" 
                value={activityTypeFilter} 
                onValueChange={handleActivityTypeChange}
                className="h-8"
              >
                <ToggleGroupItem 
                  value="linkedin_message" 
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Linkedin className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="phone_call" 
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Phone className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Filtre Période */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="space-y-2">
                    <Button
                      variant={timeFilter === '1h' ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setTimeFilter('1h')}
                    >
                      Dernière heure
                    </Button>
                    <Button
                      variant={timeFilter === 'today' ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setTimeFilter('today')}
                    >
                      Aujourd'hui
                    </Button>
                    <Button
                      variant={timeFilter === 'yesterday' ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setTimeFilter('yesterday')}
                    >
                      Hier
                    </Button>
                    <div className="border-t pt-2">
                      <p className="text-xs text-gray-500 mb-2">Date personnalisée</p>
                      <Calendar
                        mode="single"
                        selected={customDate}
                        onSelect={(date) => {
                          setCustomDate(date);
                          setTimeFilter('custom');
                        }}
                        className="pointer-events-auto"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Badge avec le nombre d'activités filtrées */}
              <Badge variant="secondary" className="text-xs h-6">
                {filteredNotifications.length}
              </Badge>
            </div>
          </div>

          {/* Liste des activités */}
          <div className="flex-1 overflow-y-auto">
            <ActivityList
              activities={displayedActivities}
              selectedActivity={selectedActivity}
              onSelectActivity={setSelectedActivity}
              onLoadMore={canLoadMore ? loadMoreActivities : undefined}
              canLoadMore={canLoadMore}
            />
          </div>
        </div>

        {/* Détail de l'activité */}
        <div className="flex-1 bg-white">
          <ActivityDetail activity={selectedActivity} />
        </div>
      </div>
    </div>
  );
};

export default History;
