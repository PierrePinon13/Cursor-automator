
import React, { useState } from 'react';
import { useHistory } from '@/hooks/useHistory';
import HistoryFilters from '@/components/history/HistoryFilters';
import HistoryStats from '@/components/history/HistoryStats';
import ActivityList from '@/components/history/ActivityList';
import ActivityDetail from '@/components/history/ActivityDetail';
import { useSidebar } from '@/components/ui/sidebar';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';
import UserActionsDropdown from '@/components/UserActionsDropdown';

const History = () => {
  const { activities, loading } = useHistory();
  const { toggleSidebar } = useSidebar();
  const [selectedActivity, setSelectedActivity] = useState(null);
  
  // États pour les filtres
  const [filterBy, setFilterBy] = useState<'all' | 'mine'>('all');
  const [activityTypes, setActivityTypes] = useState<string[]>(['linkedin_message', 'phone_call']);
  const [timeFilter, setTimeFilter] = useState('7d');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CustomSidebarTrigger />
            <h1 className="text-2xl font-bold text-gray-900">Historique des activités</h1>
          </div>
          <UserActionsDropdown />
        </div>
        
        <HistoryStats activities={activities} />
        <HistoryFilters 
          filterBy={filterBy}
          onFilterByChange={setFilterBy}
          activityTypes={activityTypes}
          onActivityTypesChange={setActivityTypes}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          activitiesCount={activities.length}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      </div>
      
      {/* Contenu principal en deux colonnes */}
      <div className="flex h-[calc(100vh-280px)] bg-white">
        {/* Liste des activités à gauche */}
        <div className="w-1/2 border-r border-gray-200">
          <ActivityList 
            activities={activities}
            selectedActivity={selectedActivity}
            onSelectActivity={setSelectedActivity}
          />
        </div>
        
        {/* Détail de l'activité à droite */}
        <div className="w-1/2">
          <ActivityDetail activity={selectedActivity} />
        </div>
      </div>
    </div>
  );
};

export default History;
