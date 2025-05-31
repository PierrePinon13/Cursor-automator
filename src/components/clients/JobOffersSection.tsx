
import { useState } from 'react';
import { useClientJobOffers } from '@/hooks/useClientJobOffers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Calendar, MapPin, DollarSign, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClientLeadsView } from './ClientLeadsView';

export function JobOffersSection() {
  const { jobOffers, loading, refreshJobOffers } = useClientJobOffers();

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
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {jobOffers.length} offres
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

        {/* Message de débogage temporaire */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Informations de débogage :</h4>
          <p className="text-sm text-blue-800">
            📊 Nombre total d'offres récupérées : {jobOffers.length}
          </p>
          <p className="text-sm text-blue-800">
            📅 Dernière actualisation : {new Date().toLocaleTimeString('fr-FR')}
          </p>
          <p className="text-sm text-blue-800">
            🔍 Vérifiez la console du navigateur (F12) pour plus de détails
          </p>
        </div>

        {jobOffers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucune offre d'emploi trouvée</p>
                <p className="text-sm mt-2">
                  Les offres d'emploi de vos clients apparaîtront ici automatiquement
                </p>
                <p className="text-sm mt-1 text-blue-600">
                  Si vous attendez des données reçues à 22h42, elles devraient apparaître ici
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
                        <span className="text-xs text-gray-500">
                          ID: {offer.id.slice(0, 8)}...
                        </span>
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
                    
                    <div className="flex items-center gap-2 text-gray-500">
                      {offer.posted_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(offer.posted_at), 'dd MMM yyyy', { locale: fr })}
                        </div>
                      )}
                      <span className="text-xs">
                        Ajouté: {format(new Date(offer.created_at), 'dd/MM HH:mm', { locale: fr })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="client-posts" className="space-y-4">
        <ClientLeadsView />
      </TabsContent>
    </Tabs>
  );
}
