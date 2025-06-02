
import { useState } from 'react';
import { useClientJobOffers } from '@/hooks/useClientJobOffers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientLeadsView } from './ClientLeadsView';
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
    animatingItems
  } = useClientJobOffers();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="w-8"></div> {/* Spacer for alignment */}
        
        <Tabs defaultValue="job-offers" className="w-auto">
          <TabsList className="grid grid-cols-2 h-9 bg-white border border-gray-200 p-1">
            <TabsTrigger 
              value="job-offers" 
              className="px-4 py-1 text-sm font-medium data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 transition-all duration-200"
            >
              Offres d'emploi
            </TabsTrigger>
            <TabsTrigger 
              value="client-posts" 
              className="px-4 py-1 text-sm font-medium data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 transition-all duration-200"
            >
              Publications LinkedIn
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="job-offers" className="space-y-6 mt-6">
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
          </TabsContent>
          
          <TabsContent value="client-posts" className="space-y-4 mt-6">
            <ClientLeadsView />
          </TabsContent>
        </Tabs>
        
        <div className="w-8"></div> {/* Spacer for alignment */}
      </div>
    </div>
  );
}
