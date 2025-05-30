
import React, { useState } from 'react';
import ActivityList from '@/components/history/ActivityList';
import ActivityDetail from '@/components/history/ActivityDetail';
import HistoryFilters from '@/components/history/HistoryFilters';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import { useActivities } from '@/hooks/useActivities';
import { HistoryActivity } from '@/hooks/useHistory';

interface LeadData {
  author_name?: string;
  author_headline?: string;
  author_profile_url?: string;
  company_name?: string;
  company_position?: string;
  matched_client_name?: string;
  latest_post_urn?: string;
  latest_post_url?: string;
}

const History = () => {
  const [selectedActivity, setSelectedActivity] = useState<HistoryActivity | null>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'mine'>('all');
  const [activityTypes, setActivityTypes] = useState<string[]>(['linkedin_message', 'phone_call']);
  const [timeFilter, setTimeFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchQuery, setSearchQuery] = useState('');

  const { activities, loading, fetchActivities } = useActivities();

  // Effectuer la recherche avec les filtres
  React.useEffect(() => {
    console.log('🔍 History - Fetching activities with filters:', {
      filterBy,
      activityTypes,
      timeFilter,
      customDateRange
    });
    
    const customRange = timeFilter === 'custom' ? customDateRange : undefined;
    fetchActivities(filterBy, activityTypes, timeFilter, customRange);
  }, [filterBy, activityTypes, timeFilter, customDateRange, fetchActivities]);

  // Transformer les données d'activités pour correspondre au format HistoryActivity
  const transformedActivities: HistoryActivity[] = activities.map((activity) => {
    const lead: LeadData = activity.lead || {
      author_name: '',
      author_headline: '',
      author_profile_url: '',
      company_name: '',
      company_position: '',
      matched_client_name: '',
      latest_post_urn: '',
      latest_post_url: ''
    };
    const activityData = activity.activity_data || {};
    
    let title = '';
    let message = '';
    
    switch (activity.activity_type) {
      case 'linkedin_message':
        const messageType = activityData.message_type || 'direct_message';
        const networkDistance = activityData.network_distance ? ` (${activityData.network_distance})` : '';
        
        if (messageType === 'connection_request') {
          title = 'Demande de connexion LinkedIn';
          message = `Demande de connexion envoyée à ${lead.author_name || 'Lead inconnu'}${networkDistance}${lead.company_position ? ` - ${lead.company_position}` : ''}`;
        } else {
          title = 'Message LinkedIn';
          message = `Message direct envoyé à ${lead.author_name || 'Lead inconnu'}${networkDistance}${lead.company_position ? ` - ${lead.company_position}` : ''}`;
        }
        break;
        
      case 'phone_call':
        const statusText = activity.outcome === 'positive' ? 'positif' : 
                          activity.outcome === 'negative' ? 'négatif' : 'neutre';
        title = `Appel ${statusText}`;
        message = `Appel ${statusText} avec ${lead.author_name || 'Lead inconnu'}${lead.company_position ? ` - ${lead.company_position}` : ''}`;
        break;
        
      default:
        title = 'Activité';
        message = 'Activité non définie';
    }

    return {
      id: activity.id,
      type: activity.activity_type as 'linkedin_message' | 'phone_call',
      title,
      message,
      created_at: activity.performed_at,
      lead_data: lead,
      sender_name: activity.performed_by_user_name || 'Utilisateur Inconnu',
      message_type: activityData.message_type as 'connection_request' | 'direct_message'
    };
  });

  console.log('📊 History - Transformed activities:', transformedActivities.length, transformedActivities);

  // Filtrer les activités selon la recherche
  const filteredActivities = transformedActivities.filter(activity => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      activity.title.toLowerCase().includes(searchLower) ||
      activity.message.toLowerCase().includes(searchLower) ||
      activity.lead_data.author_name?.toLowerCase().includes(searchLower) ||
      activity.lead_data.company_name?.toLowerCase().includes(searchLower) ||
      activity.sender_name.toLowerCase().includes(searchLower)
    );
  });

  console.log('🔍 History - Final filtered activities:', {
    searchQuery,
    filteredCount: filteredActivities.length,
    totalCount: transformedActivities.length,
    activities: filteredActivities
  });

  const handleSelectActivity = (activity: HistoryActivity) => {
    setSelectedActivity(activity);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header minimal avec juste les boutons de navigation */}
      <div className="flex items-center justify-between p-3 bg-white border-b">
        <SidebarTrigger />
        <UserActionsDropdown />
      </div>

      <div className="flex h-[calc(100vh-60px)]">
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
