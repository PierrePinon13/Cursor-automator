
import { useState } from 'react';
import { useClientJobOffers } from '@/hooks/useClientJobOffers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Calendar, MapPin, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClientLeadsSection } from './ClientLeadsSection';

export function JobOffersSection() {
  const { jobOffers, loading } = useClientJobOffers();

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
        <TabsTrigger value="client-posts">Publications clients</TabsTrigger>
      </TabsList>
      
      <TabsContent value="job-offers" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Offres d'emploi des clients</h3>
          <Badge variant="secondary">
            {jobOffers.length} offres
          </Badge>
        </div>

        {jobOffers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune offre d'emploi trouvée</p>
                <p className="text-sm mt-2">
                  Les offres d'emploi de vos clients apparaîtront ici automatiquement
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobOffers.map((offer) => (
              <Card key={offer.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base mb-2">{offer.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {offer.company_name && (
                          <span className="font-medium">{offer.company_name}</span>
                        )}
                        {offer.matched_client_name && (
                          <Badge variant="outline">
                            Client: {offer.matched_client_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a 
                        href={offer.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {offer.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {offer.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      {offer.location && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {offer.location}
                        </div>
                      )}
                      {offer.salary && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <DollarSign className="h-3 w-3" />
                          {offer.salary}
                        </div>
                      )}
                      {offer.job_type && (
                        <Badge variant="secondary" className="text-xs">
                          {offer.job_type}
                        </Badge>
                      )}
                    </div>
                    
                    {offer.posted_at && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(offer.posted_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="client-posts" className="space-y-4">
        <ClientLeadsSection />
      </TabsContent>
    </Tabs>
  );
}
