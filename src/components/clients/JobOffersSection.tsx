
import { useClientJobOffers } from '@/hooks/useClientJobOffers';
import { VisualJobOffersFilters } from './VisualJobOffersFilters';
import { GroupedJobOffersTable } from './GroupedJobOffersTable';
import { Button } from "@/components/ui/button";

export function JobOffersSection() {
  const { 
    filteredJobOffers, 
    users,
    loading, 
    refreshJobOffers,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedClientFilter,
    setSelectedClientFilter,
    selectedAssignmentFilter,
    setSelectedAssignmentFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    availableClients,
    assignJobOffer,
    updateJobOfferStatus,
    animatingItems,
    hasMore,
    loadMore
  } = useClientJobOffers();

  if (loading && filteredJobOffers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <VisualJobOffersFilters 
        selectedDateFilter={selectedDateFilter}
        setSelectedDateFilter={setSelectedDateFilter}
        selectedClientFilter={selectedClientFilter}
        setSelectedClientFilter={setSelectedClientFilter}
        selectedAssignmentFilter={selectedAssignmentFilter}
        setSelectedAssignmentFilter={setSelectedAssignmentFilter}
        selectedStatusFilter={selectedStatusFilter}
        setSelectedStatusFilter={setSelectedStatusFilter}
        availableClients={availableClients}
        filteredJobOffers={filteredJobOffers}
        refreshJobOffers={refreshJobOffers}
      />

      <GroupedJobOffersTable 
        jobOffers={filteredJobOffers}
        users={users}
        onAssignJobOffer={assignJobOffer}
        onUpdateStatus={updateJobOfferStatus}
        animatingItems={animatingItems}
      />

      {/* Ajout bouton 'Charger plus' si pagination */}
      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            className="mx-auto my-4"
          >
            Charger plus d’offres
          </Button>
        </div>
      )}
    </div>
  );
}

