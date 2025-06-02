
import { useState } from 'react';
import { useClientJobOffers } from '@/hooks/useClientJobOffers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Filter } from 'lucide-react';
import { ClientLeadsView } from './ClientLeadsView';
import { JobOffersTable } from './JobOffersTable';

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
    availableClients,
    assignJobOffer
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Offres d'emploi des clients</h3>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {filteredJobOffers.length} offres
            </Badge>
            <Button
              onClick={refreshJobOffers}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Période</label>
                <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les périodes</SelectItem>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="yesterday">Hier</SelectItem>
                    <SelectItem value="last_7_days">7 derniers jours</SelectItem>
                    <SelectItem value="last_30_days">30 derniers jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Client</label>
                <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les clients</SelectItem>
                    {availableClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assignation</label>
                <Select value={selectedAssignmentFilter} onValueChange={setSelectedAssignmentFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="assigned">Assignées</SelectItem>
                    <SelectItem value="unassigned">Non assignées</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des offres */}
        <JobOffersTable 
          jobOffers={filteredJobOffers}
          users={users}
          onAssignJobOffer={assignJobOffer}
        />
      </TabsContent>
      
      <TabsContent value="client-posts" className="space-y-4">
        <ClientLeadsView />
      </TabsContent>
    </Tabs>
  );
}
