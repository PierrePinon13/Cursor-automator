
import { useState } from 'react';
import { useClientLeads } from '@/hooks/useClientLeads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, User, Building } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function ClientLeadsSection() {
  const { clientLeads, loading } = useClientLeads();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Grouper les leads par client
  const leadsByClient = clientLeads.reduce((acc, lead) => {
    const clientName = lead.matched_client_name || 'Non assigné';
    if (!acc[clientName]) {
      acc[clientName] = [];
    }
    acc[clientName].push(lead);
    return acc;
  }, {} as Record<string, typeof clientLeads>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Publications LinkedIn des clients</h3>
        <Badge variant="secondary">
          {clientLeads.length} publications
        </Badge>
      </div>

      {Object.keys(leadsByClient).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune publication de client trouvée</p>
              <p className="text-sm mt-2">
                Les publications des employés de vos clients apparaîtront ici
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(leadsByClient).map(([clientName, leads]) => (
            <Card key={clientName} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setSelectedClient(selectedClient === clientName ? null : clientName)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {clientName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {leads.length} publication{leads.length > 1 ? 's' : ''}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      {selectedClient === clientName ? '−' : '+'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {selectedClient === clientName && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {leads.map((lead) => (
                      <div key={lead.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{lead.author_name}</span>
                              {lead.company_position && (
                                <Badge variant="secondary" className="text-xs">
                                  {lead.company_position}
                                </Badge>
                              )}
                            </div>
                            
                            {lead.title && (
                              <h4 className="font-medium text-sm mb-2">{lead.title}</h4>
                            )}
                            
                            <p className="text-sm text-gray-600 line-clamp-3">
                              {lead.text}
                            </p>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="ml-4"
                          >
                            <a 
                              href={lead.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-4">
                            {lead.openai_step3_categorie && (
                              <Badge variant="outline" className="text-xs">
                                {lead.openai_step3_categorie}
                              </Badge>
                            )}
                            {lead.openai_step2_localisation && (
                              <span>📍 {lead.openai_step2_localisation}</span>
                            )}
                          </div>
                          
                          {lead.posted_at_iso && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(lead.posted_at_iso), 'dd MMM yyyy', { locale: fr })}
                            </div>
                          )}
                        </div>
                        
                        {lead.openai_step3_postes_selectionnes && lead.openai_step3_postes_selectionnes.length > 0 && (
                          <div className="pt-2 border-t">
                            <div className="text-xs text-gray-500 mb-1">Postes recherchés :</div>
                            <div className="flex flex-wrap gap-1">
                              {lead.openai_step3_postes_selectionnes.map((poste, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {poste}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
