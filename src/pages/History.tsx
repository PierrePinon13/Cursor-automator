
import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useSidebar } from '@/components/ui/sidebar';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';
import ActivityList from '@/components/history/ActivityList';
import ActivityDetail from '@/components/history/ActivityDetail';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const History = () => {
  const { notifications, refreshNotifications } = useNotifications();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'mine'>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<'all' | 'linkedin_message' | 'phone_call'>('all');

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Sélectionner automatiquement la première activité si aucune n'est sélectionnée
  useEffect(() => {
    if (!selectedActivity && notifications.length > 0) {
      setSelectedActivity(notifications[0]);
    }
  }, [notifications, selectedActivity]);

  // Filtrer les notifications
  const filteredNotifications = notifications.filter(notification => {
    // Filtre par type d'activité
    if (activityTypeFilter !== 'all' && notification.type !== activityTypeFilter) {
      return false;
    }
    
    // Pour l'instant, on considère toutes les activités comme "miennes"
    // Dans une vraie application, on filtrerait par utilisateur
    return true;
  });

  const getActivityTypeCount = (type: string) => {
    if (type === 'all') return notifications.length;
    return notifications.filter(n => n.type === type).length;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Header fixe */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <CustomSidebarTrigger />
          <h1 className="text-2xl font-bold text-gray-900">Historique des activités</h1>
        </div>
      </div>

      {/* Contenu principal avec marge top pour le header fixe */}
      <div className="flex w-full pt-20">
        {/* Sidebar des activités - même largeur que la sidebar principale */}
        <div className="w-[14.4rem] bg-white border-r border-gray-200 h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
          {/* Filtres */}
          <div className="p-4 border-b border-gray-200 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Activités
              </label>
              <Select value={filterBy} onValueChange={(value: 'all' | 'mine') => setFilterBy(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les activités</SelectItem>
                  <SelectItem value="mine">Mes activités</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Type d'activité
              </label>
              <Select value={activityTypeFilter} onValueChange={(value: 'all' | 'linkedin_message' | 'phone_call') => setActivityTypeFilter(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center justify-between w-full">
                      <span>Tous</span>
                      <Badge variant="secondary" className="ml-2">
                        {getActivityTypeCount('all')}
                      </Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="linkedin_message">
                    <div className="flex items-center justify-between w-full">
                      <span>Messages LinkedIn</span>
                      <Badge variant="secondary" className="ml-2">
                        {getActivityTypeCount('linkedin_message')}
                      </Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="phone_call">
                    <div className="flex items-center justify-between w-full">
                      <span>Appels</span>
                      <Badge variant="secondary" className="ml-2">
                        {getActivityTypeCount('phone_call')}
                      </Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Liste des activités */}
          <div className="flex-1 overflow-y-auto">
            <ActivityList
              activities={filteredNotifications}
              selectedActivity={selectedActivity}
              onSelectActivity={setSelectedActivity}
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
