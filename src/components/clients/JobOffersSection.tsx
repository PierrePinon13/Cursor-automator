
import { useState } from 'react';
import { useClientJobOffers } from '@/hooks/useClientJobOffers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientLeadsView } from './ClientLeadsView';
import { CompactJobOffersFilters } from './CompactJobOffersFilters';
import { CompactJobOffersTable } from './CompactJobOffersTable';

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
    updateJobOfferStatus
  } = useClientJobOffers();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="job-offers" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="job-offers">Offres d'emploi</TabsTrigger>
        <TabsTrigger value="client-posts">Publications LinkedIn</TabsTrigger>
      </TabsList>
      
      <TabsContent value="job-offers" className="space-y-4">
        <CompactJobOffersFilters 
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

        <CompactJobOffersTable 
          jobOffers={filteredJobOffers}
          users={users}
          onAssignJobOffer={assignJobOffer}
          onUpdateStatus={updateJobOfferStatus}
        />
      </TabsContent>
      
      <TabsContent value="client-posts" className="space-y-4">
        <ClientLeadsView />
      </TabsContent>
    </Tabs>
  );
}
