
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
      <Tabs defaultValue="job-offers" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-gray-50/50 border border-gray-200/60 p-1 rounded-lg shadow-sm">
            <TabsTrigger 
              value="job-offers" 
              className="relative px-6 py-2.5 text-sm font-semibold rounded-md transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-gray-200 text-gray-600 hover:text-gray-800"
            >
              Offres d'emploi
            </TabsTrigger>
            <TabsTrigger 
              value="client-posts" 
              className="relative px-6 py-2.5 text-sm font-semibold rounded-md transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-gray-200 text-gray-600 hover:text-gray-800"
            >
              Publications LinkedIn
            </TabsTrigger>
          </TabsList>
        </div>
        
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
    </div>
  );
}
