
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
