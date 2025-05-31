
import { useState } from 'react';
import { useClientLeadsNew } from '@/hooks/useClientLeadsNew';
import LeadsFilters from '@/components/leads/LeadsFilters';
import DraggableTable from '@/components/leads/DraggableTable';
import CardView from '@/components/leads/CardView';
import SavedViewsButton from '@/components/leads/SavedViewsButton';
import { Badge } from '@/components/ui/badge';

export function ClientLeadsView() {
  const {
    filteredLeads,
    loading,
    selectedCategories,
    setSelectedCategories,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedContactFilter,
    setSelectedContactFilter,
    availableCategories,
    searchQuery,
    setSearchQuery,
    refreshLeads
  } = useClientLeadsNew();

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'posted_date',
    'job_title',
    'author_name',
    'company',
    'last_contact',
    'category',
    'location'
  ]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des publications clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec titre et statistiques */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Publications clients</h2>
          <Badge variant="secondary" className="text-sm">
            {filteredLeads.length} publication{filteredLeads.length > 1 ? 's' : ''}
          </Badge>
        </div>
        
        <SavedViewsButton
          selectedCategories={selectedCategories}
          visibleColumns={visibleColumns}
          selectedDateFilter={selectedDateFilter}
          selectedContactFilter={selectedContactFilter}
          viewMode={viewMode}
          onApplyView={(viewConfig) => {
            setSelectedCategories(viewConfig.selectedCategories);
            setVisibleColumns(viewConfig.visibleColumns);
            setSelectedDateFilter(viewConfig.selectedDateFilter);
            setSelectedContactFilter(viewConfig.selectedContactFilter);
            setViewMode(viewConfig.viewMode);
          }}
        />
      </div>

      {/* Filtres */}
      <LeadsFilters
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        selectedDateFilter={selectedDateFilter}
        setSelectedDateFilter={setSelectedDateFilter}
        selectedContactFilter={selectedContactFilter}
        setSelectedContactFilter={setSelectedContactFilter}
        availableCategories={availableCategories}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        showContactFilter={true}
        showAssignmentColumn={false}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Contenu principal */}
      <div className="bg-white rounded-lg shadow">
        {viewMode === 'table' ? (
          <DraggableTable
            leads={filteredLeads}
            visibleColumns={visibleColumns}
            onActionCompleted={refreshLeads}
            selectedLeadIndex={selectedLeadIndex}
            onLeadSelect={setSelectedLeadIndex}
          />
        ) : (
          <CardView
            leads={filteredLeads}
            onActionCompleted={refreshLeads}
            selectedLeadIndex={selectedLeadIndex}
            onLeadSelect={setSelectedLeadIndex}
          />
        )}
      </div>

      {/* Message si aucun résultat */}
      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <p className="text-lg mb-2">Aucune publication client trouvée</p>
            <p className="text-sm">
              Ajustez vos filtres ou vérifiez que des clients ont publié récemment
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
