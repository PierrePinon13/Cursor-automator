
import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useSidebar } from '@/components/ui/sidebar';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';
import ActivityList from '@/components/history/ActivityList';
import ActivityDetail from '@/components/history/ActivityDetail';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { User, Users, Linkedin, Phone, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const History = () => {
  const { notifications, refreshNotifications } = useNotifications();
  const { user } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'mine'>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string[]>(['linkedin_message', 'phone_call']);
  const [timeFilter, setTimeFilter] = useState<'1h' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'>('today');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
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
      case 'this_week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lundi de cette semaine
        startOfWeek.setHours(0, 0, 0, 0);
        return notifDate >= startOfWeek;
      case 'last_week':
        const startOfLastWeek = new Date(now);
        startOfLastWeek.setDate(now.getDate() - now.getDay() - 6); // Lundi de la semaine dernière
        startOfLastWeek.setHours(0, 0, 0, 0);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6); // Dimanche de la semaine dernière
        endOfLastWeek.setHours(23, 59, 59, 999);
        return notifDate >= startOfLastWeek && notifDate <= endOfLastWeek;
      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return notifDate >= startOfMonth;
      case 'last_month':
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        endOfLastMonth.setHours(23, 59, 59, 999);
        return notifDate >= startOfLastMonth && notifDate <= endOfLastMonth;
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          const from = new Date(customDateRange.from);
          from.setHours(0, 0, 0, 0);
          const to = new Date(customDateRange.to);
          to.setHours(23, 59, 59, 999);
          return notifDate >= from && notifDate <= to;
        } else if (customDateRange.from) {
          return notifDate.toDateString() === customDateRange.from.toDateString();
        }
        return true;
      default:
        return true;
    }
  };

  // Filtrer les notifications par utilisateur
  const filterByUser = (notification: any) => {
    if (filterBy === 'all') return true;
    
    // Pour les messages LinkedIn, vérifier si l'utilisateur connecté est l'expéditeur
    if (notification.type === 'linkedin_message') {
      return notification.sender_name === user?.user_metadata?.full_name;
    }
    
    // Pour les appels téléphoniques, vérifier si l'utilisateur connecté a fait l'appel
    if (notification.type === 'phone_call') {
      return notification.sender_name === user?.user_metadata?.full_name;
    }
    
    // Pour les assignations de leads, considérer comme "mine" si assigné à l'utilisateur
    if (notification.type === 'lead_assigned') {
      return true; // Les assignations sont déjà filtrées par utilisateur dans useNotifications
    }
    
    return true;
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
    
    // Filtre par utilisateur
    if (!filterByUser(notification)) {
      return false;
    }
    
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

  const handleActivityTypeChange = (values: string[]) => {
    setActivityTypeFilter(values);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (!customDateRange.from || (customDateRange.from && customDateRange.to)) {
      // Première sélection ou reset
      setCustomDateRange({ from: date, to: undefined });
    } else {
      // Deuxième sélection pour créer une période
      if (date < customDateRange.from) {
        setCustomDateRange({ from: date, to: customDateRange.from });
      } else {
        setCustomDateRange({ from: customDateRange.from, to: date });
      }
    }
    setTimeFilter('custom');
  };

  const resetCustomDate = () => {
    setCustomDateRange({});
    setTimeFilter('today');
  };

  const getCustomDateText = () => {
    if (customDateRange.from && customDateRange.to) {
      return `${format(customDateRange.from, 'dd/MM', { locale: fr })} - ${format(customDateRange.to, 'dd/MM', { locale: fr })}`;
    } else if (customDateRange.from) {
      return format(customDateRange.from, 'dd/MM/yyyy', { locale: fr });
    }
    return '';
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Contenu principal */}
      <div className="flex w-full h-full">
        {/* Sidebar des activités */}
        <div className="w-[24.31rem] bg-white border-r border-gray-200 h-full overflow-hidden flex flex-col">
          {/* Header avec trigger sidebar et filtres */}
          <div className="p-4 space-y-4 flex-shrink-0">
            <CustomSidebarTrigger />
            
            {/* Filtres rapprochés avec compteur séparé */}
            <div className="flex items-center justify-between">
              {/* Groupe de filtres rapprochés */}
              <div className="flex items-center gap-2">
                {/* Filtre Utilisateur/Tout le monde */}
                <div className="border border-gray-200 rounded-md p-0.5 bg-white">
                  <ToggleGroup 
                    type="single" 
                    value={filterBy} 
                    onValueChange={(value) => value && setFilterBy(value as 'all' | 'mine')}
                    className="h-5"
                  >
                    <ToggleGroupItem 
                      value="mine" 
                      size="sm"
                      className="h-5 w-5 p-0 data-[state=on]:bg-blue-500 data-[state=on]:text-white border-0"
                    >
                      <User className="h-3 w-3" />
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="all" 
                      size="sm"
                      className="h-5 w-5 p-0 data-[state=on]:bg-blue-500 data-[state=on]:text-white border-0"
                    >
                      <Users className="h-3 w-3" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Filtre Type d'activité */}
                <div className="border border-gray-200 rounded-md p-0.5 bg-white">
                  <ToggleGroup 
                    type="multiple" 
                    value={activityTypeFilter} 
                    onValueChange={handleActivityTypeChange}
                    className="h-5"
                  >
                    <ToggleGroupItem 
                      value="linkedin_message" 
                      size="sm"
                      className="h-5 w-5 p-0 data-[state=on]:bg-blue-500 data-[state=on]:text-white border-0"
                    >
                      <Linkedin className="h-3 w-3" />
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="phone_call" 
                      size="sm"
                      className="h-5 w-5 p-0 data-[state=on]:bg-blue-500 data-[state=on]:text-white border-0"
                    >
                      <Phone className="h-3 w-3" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Filtre Période */}
                <div className="border border-gray-200 rounded-md bg-white">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-blue-500 hover:text-white"
                      >
                        <Clock className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <div className="space-y-3">
                        {/* Première ligne : Dernière heure, Aujourd'hui, Hier */}
                        <div className="flex justify-center gap-1">
                          <Button
                            variant={timeFilter === '1h' ? 'default' : 'ghost'}
                            size="sm"
                            className="text-xs px-3 h-7 flex-1"
                            onClick={() => setTimeFilter('1h')}
                          >
                            1h
                          </Button>
                          <Button
                            variant={timeFilter === 'today' ? 'default' : 'ghost'}
                            size="sm"
                            className="text-xs px-3 h-7 flex-1"
                            onClick={() => setTimeFilter('today')}
                          >
                            Aujourd'hui
                          </Button>
                          <Button
                            variant={timeFilter === 'yesterday' ? 'default' : 'ghost'}
                            size="sm"
                            className="text-xs px-3 h-7 flex-1"
                            onClick={() => setTimeFilter('yesterday')}
                          >
                            Hier
                          </Button>
                        </div>

                        {/* Deuxième ligne : Cette semaine, Semaine dernière */}
                        <div className="flex justify-center gap-1">
                          <Button
                            variant={timeFilter === 'this_week' ? 'default' : 'ghost'}
                            size="sm"
                            className="text-xs px-3 h-7 flex-1"
                            onClick={() => setTimeFilter('this_week')}
                          >
                            Cette semaine
                          </Button>
                          <Button
                            variant={timeFilter === 'last_week' ? 'default' : 'ghost'}
                            size="sm"
                            className="text-xs px-3 h-7 flex-1"
                            onClick={() => setTimeFilter('last_week')}
                          >
                            Semaine dernière
                          </Button>
                        </div>

                        {/* Troisième ligne : Ce mois-ci, Mois dernier */}
                        <div className="flex justify-center gap-1">
                          <Button
                            variant={timeFilter === 'this_month' ? 'default' : 'ghost'}
                            size="sm"
                            className="text-xs px-3 h-7 flex-1"
                            onClick={() => setTimeFilter('this_month')}
                          >
                            Ce mois-ci
                          </Button>
                          <Button
                            variant={timeFilter === 'last_month' ? 'default' : 'ghost'}
                            size="sm"
                            className="text-xs px-3 h-7 flex-1"
                            onClick={() => setTimeFilter('last_month')}
                          >
                            Mois dernier
                          </Button>
                        </div>

                        {/* Date personnalisée */}
                        <div className="border-t pt-3">
                          {customDateRange.from && (
                            <div className="mb-2 text-center">
                              <span className="text-xs text-gray-600">
                                {customDateRange.to ? 'Période: ' : 'Date: '}
                                {getCustomDateText()}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-2 h-5 text-xs"
                                onClick={resetCustomDate}
                              >
                                Reset
                              </Button>
                            </div>
                          )}
                          <Calendar
                            mode="single"
                            selected={customDateRange.from}
                            onSelect={handleDateSelect}
                            className="pointer-events-auto"
                          />
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            Cliquez une fois pour une date, deux fois pour une période
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Compteur d'activités séparé */}
              <div className="text-xs text-gray-500 italic">
                {filteredNotifications.length} activités sur la période
              </div>
            </div>
          </div>

          {/* Liste des activités */}
          <div className="flex-1 overflow-hidden">
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
        <div className="flex-1 bg-white overflow-hidden">
          <ActivityDetail activity={selectedActivity} />
        </div>
      </div>
    </div>
  );
};

export default History;
