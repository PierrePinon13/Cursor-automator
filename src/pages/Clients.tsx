
import { useState } from 'react';
import { useClientLeads } from '@/hooks/useClientLeads';
import { useLeadAssignments } from '@/hooks/useLeadAssignments';
import { useClients } from '@/hooks/useClients';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Settings, Table, Grid3X3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LeadsFilters } from '@/components/leads/LeadsFilters';
import DraggableTable from '@/components/leads/DraggableTable';
import { CardView } from '@/components/leads/CardView';
import { Badge } from '@/components/ui/badge';

const Clients = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number | null>(null);
  const [visibleColumns, setVisibleColumns] = useState([
    'author_name',
    'unipile_company',
    'openai_step3_categorie',
    'openai_step2_localisation',
    'posted_at',
    'matched_client_name',
    'assignment'
  ]);

  const {
    filteredLeads,
    loading,
    selectedCategories,
    setSelectedCategories,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedTaskFilter,
    setSelectedTaskFilter,
    availableCategories,
    refreshLeads
  } = useClientLeads();

  const { getAssignedUsers } = useLeadAssignments();
  const { clients } = useClients();

  // Enrichir les leads avec les informations d'assignation et de pré-assignation
  const enrichedLeads = filteredLeads.map(lead => {
    // Trouver le client correspondant pour obtenir les collaborateurs pré-assignés
    const matchedClient = clients.find(c => c.id === lead.matched_client_id);
    const preAssignedUsers = matchedClient?.collaborators || [];
    
    return {
      ...lead,
      preAssignedUsers,
      assignedUsers: getAssignedUsers(lead.id)
    };
  });

  const handleActionCompleted = () => {
    refreshLeads();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des leads clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <Badge variant="secondary">{enrichedLeads.length} leads</Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Filtres Tous / Mes tâches */}
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              <Button
                variant={selectedTaskFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTaskFilter('all')}
                className="text-xs"
              >
                Tous
              </Button>
              <Button
                variant={selectedTaskFilter === 'my_tasks' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTaskFilter('my_tasks')}
                className="text-xs"
              >
                Mes tâches
              </Button>
            </div>

            {/* Toggle vue tableau/cartes */}
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={() => navigate('/client-settings')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Paramètres clients
            </Button>
          </div>
        </div>

        <LeadsFilters
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          selectedDateFilter={selectedDateFilter}
          setSelectedDateFilter={setSelectedDateFilter}
          availableCategories={availableCategories}
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          showContactFilter={false}
          showAssignmentColumn={true}
        />

        <div className="mt-6">
          {viewMode === 'table' ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <DraggableTable
                leads={enrichedLeads}
                visibleColumns={visibleColumns}
                onActionCompleted={handleActionCompleted}
                selectedLeadIndex={selectedLeadIndex}
                onLeadSelect={setSelectedLeadIndex}
              />
            </div>
          ) : (
            <CardView
              leads={enrichedLeads}
              onActionCompleted={handleActionCompleted}
              selectedLeadIndex={selectedLeadIndex}
              onLeadSelect={setSelectedLeadIndex}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Clients;
