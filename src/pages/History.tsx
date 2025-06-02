
import React, { useState, useEffect } from 'react';
import ActivityList from '@/components/history/ActivityList';
import ActivityDetail from '@/components/history/ActivityDetail';
import HistoryFilters from '@/components/history/HistoryFilters';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import { useHistory } from '@/hooks/useHistory';

const History = () => {
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'mine'>('all');
  const [activityTypes, setActivityTypes] = useState<string[]>(['linkedin_message', 'phone_call']);
  const [timeFilter, setTimeFilter] = useState('this-week');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Utiliser le hook useHistory qui récupère les vraies données d'activités
  const { activities, loading, refreshHistory } = useHistory();

  // Rafraîchir les données quand les filtres changent
  useEffect(() => {
    refreshHistory();
  }, [timeFilter, filterBy, refreshHistory]);

  // Filtrer les activités selon les critères sélectionnés
  const filteredActivities = React.useMemo(() => {
    let filtered = activities;

    // Filtrer par type d'activité
    if (activityTypes.length > 0) {
      filtered = filtered.filter(activity => activityTypes.includes(activity.type));
    }

    // Filtrer par recherche
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.title.toLowerCase().includes(searchLower) ||
        activity.message.toLowerCase().includes(searchLower) ||
        (activity.sender_name && activity.sender_name.toLowerCase().includes(searchLower)) ||
        (activity.lead_data?.author_name && activity.lead_data.author_name.toLowerCase().includes(searchLower))
      );
    }

    // Filtrer par utilisateur (mine vs all)
    // Note: cette logique pourrait être améliorée en ajoutant un filtre dans useHistory
    
    return filtered;
  }, [activities, activityTypes, searchQuery]);

  const handleSelectActivity = (activity: any) => {
    setSelectedActivity(activity);
  };

  console.log('📊 History - State:', {
    loading,
    activitiesCount: activities.length,
    filteredCount: filteredActivities.length,
    filters: { filterBy, activityTypes, timeFilter, searchQuery }
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header minimal avec juste les boutons de navigation */}
      <div className="flex items-center justify-between px-3 py-2 bg-white">
        <SidebarTrigger />
        <UserActionsDropdown />
      </div>

      <div className="flex h-[calc(100vh-48px)]">
        {/* Colonne de gauche : Fil d'actualité avec filtres - 25% de largeur */}
        <div className="w-1/4 bg-white border-r flex flex-col">
          <div className="p-2 border-b">
            <HistoryFilters
              filterBy={filterBy}
              onFilterByChange={setFilterBy}
              activityTypes={activityTypes}
              onActivityTypesChange={setActivityTypes}
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
              activitiesCount={filteredActivities.length}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />
          </div>
          
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-lg">Aucune activité trouvée</p>
                  <p className="text-sm mt-2">
                    Essayez de modifier vos filtres ou d'effectuer quelques actions pour voir l'historique
                  </p>
                </div>
              </div>
            ) : (
              <ActivityList 
                activities={filteredActivities}
                selectedActivity={selectedActivity}
                onSelectActivity={handleSelectActivity}
              />
            )}
          </div>
        </div>

        {/* Colonne de droite : Détail de l'activité - 75% de largeur */}
        <div className="w-3/4 bg-white">
          {selectedActivity ? (
            <ActivityDetail activity={selectedActivity} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg">Sélectionnez une activité pour voir les détails</p>
                <p className="text-sm mt-2">
                  {filteredActivities.length} activité{filteredActivities.length > 1 ? 's' : ''} disponible{filteredActivities.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
