
import React, { useState, useEffect, useMemo } from 'react';
import ActivityList from '@/components/history/ActivityList';
import ActivityDetail from '@/components/history/ActivityDetail';
import HistoryFilters from '@/components/history/HistoryFilters';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import { useDashboardStats, TimeRange, UserSelection } from '@/hooks/useDashboardStats';
import { HistoryActivity } from '@/hooks/useHistory';

const History = () => {
  const [selectedActivity, setSelectedActivity] = useState<HistoryActivity | null>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'mine'>('all');
  const [activityTypes, setActivityTypes] = useState<string[]>(['linkedin_message', 'phone_call']);
  const [timeFilter, setTimeFilter] = useState('this-week');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Utiliser le même hook que le Dashboard
  const { data, loading, fetchStats } = useDashboardStats();

  // Configuration de la période par défaut (cette semaine)
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end, label: 'Cette semaine' };
  });

  const [userSelection, setUserSelection] = useState<UserSelection>({
    type: filterBy === 'mine' ? 'personal' : 'global'
  });

  // Mettre à jour userSelection quand filterBy change
  useEffect(() => {
    setUserSelection({
      type: filterBy === 'mine' ? 'personal' : 'global'
    });
  }, [filterBy]);

  // Mettre à jour timeRange quand timeFilter change
  useEffect(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let newTimeRange: TimeRange;
    
    switch (timeFilter) {
      case 'today':
        newTimeRange = { start: today, end: today, label: "Aujourd'hui" };
        break;
      case 'this-week': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        newTimeRange = { start: startOfWeek, end: endOfWeek, label: 'Cette semaine' };
        break;
      }
      case 'last-week': {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 6);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        newTimeRange = { start: startOfLastWeek, end: endOfLastWeek, label: 'Semaine dernière' };
        break;
      }
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          newTimeRange = { 
            start: customDateRange.from, 
            end: customDateRange.to, 
            label: 'Période personnalisée' 
          };
        } else {
          return; // Ne pas changer si les dates custom ne sont pas définies
        }
        break;
      default:
        return;
    }
    
    setTimeRange(newTimeRange);
  }, [timeFilter, customDateRange]);

  // Charger les données quand les filtres changent
  useEffect(() => {
    console.log('🔍 History - Fetching data with:', { timeRange, userSelection });
    fetchStats(timeRange, userSelection);
  }, [timeRange, userSelection, fetchStats]);

  // Transformer les données du dashboard en format HistoryActivity
  const transformedActivities: HistoryActivity[] = useMemo(() => {
    if (!data) return [];
    
    console.log('🔄 History - Transforming dashboard data:', data);
    
    const activities: HistoryActivity[] = [];
    
    // Si on a des données d'évolution, on peut créer des activités factices
    // basées sur les stats quotidiennes
    if (data.evolution && data.evolution.length > 0) {
      data.evolution.forEach((dayData, index) => {
        // Créer des activités pour les messages LinkedIn
        for (let i = 0; i < dayData.linkedin_messages; i++) {
          activities.push({
            id: `linkedin-${dayData.date}-${i}`,
            type: 'linkedin_message',
            title: 'Message LinkedIn',
            message: `Message LinkedIn envoyé`,
            created_at: dayData.date,
            sender_name: 'Système',
            message_type: 'direct_message',
            lead_data: {}
          });
        }
        
        // Créer des activités pour les appels positifs
        for (let i = 0; i < dayData.positive_calls; i++) {
          activities.push({
            id: `call-positive-${dayData.date}-${i}`,
            type: 'phone_call',
            title: 'Appel positif',
            message: `Appel positif effectué`,
            created_at: dayData.date,
            sender_name: 'Système',
            lead_data: {}
          });
        }
        
        // Créer des activités pour les appels négatifs
        for (let i = 0; i < dayData.negative_calls; i++) {
          activities.push({
            id: `call-negative-${dayData.date}-${i}`,
            type: 'phone_call',
            title: 'Appel négatif',
            message: `Appel négatif effectué`,
            created_at: dayData.date,
            sender_name: 'Système',
            lead_data: {}
          });
        }
      });
    }
    
    // Trier par date décroissante
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log('✅ History - Generated activities:', activities.length);
    return activities;
  }, [data]);

  // Filtrer les activités selon la recherche et les types
  const filteredActivities = useMemo(() => {
    let filtered = transformedActivities;
    
    // Filtrer par type d'activité
    if (activityTypes.length > 0 && !activityTypes.includes('linkedin_message') || !activityTypes.includes('phone_call')) {
      filtered = filtered.filter(activity => activityTypes.includes(activity.type));
    }
    
    // Filtrer par recherche
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.title.toLowerCase().includes(searchLower) ||
        activity.message.toLowerCase().includes(searchLower) ||
        activity.sender_name.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [transformedActivities, activityTypes, searchQuery]);

  console.log('📊 History - Final state:', {
    loading,
    dataExists: !!data,
    evolutionCount: data?.evolution?.length || 0,
    transformedCount: transformedActivities.length,
    filteredCount: filteredActivities.length,
    filters: { filterBy, activityTypes, timeFilter, searchQuery }
  });

  const handleSelectActivity = (activity: HistoryActivity) => {
    setSelectedActivity(activity);
  };

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
                    Filtres actifs: {filterBy}, {activityTypes.join('+')}, {timeFilter}
                  </p>
                  {data && (
                    <p className="text-xs mt-1 text-gray-400">
                      Données disponibles: {data.evolution?.length || 0} jours d'évolution
                    </p>
                  )}
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
                {data && data.stats && (
                  <div className="mt-4 text-sm">
                    <p>Messages LinkedIn: {data.stats.linkedin_messages}</p>
                    <p>Appels positifs: {data.stats.positive_calls}</p>
                    <p>Appels négatifs: {data.stats.negative_calls}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
