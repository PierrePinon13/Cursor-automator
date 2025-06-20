
import { useEffect, useRef } from 'react';
import { useClientJobOffers } from '@/hooks/useClientJobOffers';
import { VisualJobOffersFilters } from './VisualJobOffersFilters';
import { GroupedJobOffersTable } from './GroupedJobOffersTable';

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

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer pour le scroll infini
  useEffect(() => {
    if (!loadMoreRef.current || loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

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

      {/* Élément pour déclencher le scroll infini */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {loading && (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Chargement d'autres offres...</span>
            </div>
          )}
        </div>
      )}

      {!hasMore && filteredJobOffers.length > 0 && (
        <div className="text-center py-4 text-gray-500">
          Toutes les offres ont été chargées
        </div>
      )}
    </div>
  );
}
