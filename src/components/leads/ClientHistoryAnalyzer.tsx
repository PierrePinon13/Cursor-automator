
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Building2 } from 'lucide-react';

interface ClientHistoryAnalyzerProps {
  lead: any;
}

const ClientHistoryAnalyzer = ({ lead }: ClientHistoryAnalyzerProps) => {
  // Analyser l'historique des 5 entreprises pour identifier les matches clients
  const getClientMatches = () => {
    const matches = [];
    
    for (let i = 1; i <= 5; i++) {
      const companyName = lead[`company_${i}_name`];
      const companyLinkedInId = lead[`company_${i}_linkedin_id`];
      const position = lead[`company_${i}_position`];
      const startDate = lead[`company_${i}_start_date`];
      const endDate = lead[`company_${i}_end_date`];
      const isCurrent = lead[`company_${i}_is_current`];
      
      if (companyName && companyLinkedInId) {
        // Vérifier si cette entreprise est dans previous_client_companies
        const isClientCompany = lead.previous_client_companies?.some((clientCompany: any) => {
          if (typeof clientCompany === 'string') {
            return clientCompany.toLowerCase() === companyName.toLowerCase();
          }
          return clientCompany.client_name?.toLowerCase() === companyName.toLowerCase() ||
                 clientCompany.company_name?.toLowerCase() === companyName.toLowerCase();
        });
        
        matches.push({
          companyName,
          position: position || 'Poste non spécifié',
          startDate,
          endDate,
          isCurrent,
          companyLinkedInId,
          isClientMatch: isClientCompany || false
        });
      }
    }
    
    return matches;
  };

  const companyMatches = getClientMatches();
  const clientMatches = companyMatches.filter(match => match.isClientMatch);

  if (companyMatches.length === 0) {
    return null;
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    
    try {
      // Essayer de parser différents formats de date
      let date: Date;
      
      if (dateString.includes('/')) {
        // Format MM/DD/YYYY ou M/D/YYYY
        const parts = dateString.split('/');
        if (parts.length === 3) {
          date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        } else {
          return dateString;
        }
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      return date.toLocaleDateString('fr-FR', {
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        <h3 className="font-semibold">Analyse historique client</h3>
        {clientMatches.length > 0 && (
          <Badge variant="default" className="bg-blue-600 text-white">
            <Crown className="h-3 w-3 mr-1" />
            {clientMatches.length} match{clientMatches.length > 1 ? 'es' : ''} client
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <strong>LinkedIn ID entreprise actuelle:</strong> 
          <span className="ml-2 font-mono text-sm">
            {lead.unipile_company_linkedin_id || lead.company_linkedin_id || 'Non récupéré'}
          </span>
        </div>

        <div>
          <strong>Statut client actuel:</strong>
          <Badge className="ml-2" variant={lead.is_client_lead ? 'default' : 'secondary'}>
            {lead.is_client_lead ? `Client: ${lead.matched_client_name}` : 'Non client'}
          </Badge>
        </div>

        <div>
          <strong>Historique professionnel:</strong>
          <div className="mt-2 space-y-2">
            {companyMatches.map((match, index) => (
              <div 
                key={index} 
                className={`p-3 rounded border ${
                  match.isClientMatch ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{match.companyName}</span>
                      {match.isClientMatch && (
                        <Badge variant="default" className="bg-blue-600 text-white text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Client
                        </Badge>
                      )}
                      {match.isCurrent && (
                        <Badge variant="secondary" className="text-xs">Actuel</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{match.position}</div>
                    {match.companyLinkedInId && (
                      <div className="text-xs text-gray-500 font-mono">
                        LinkedIn ID: {match.companyLinkedInId}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(match.startDate) || 'Date inconnue'} - {
                      match.isCurrent ? 'Présent' : (formatDate(match.endDate) || 'Date inconnue')
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {lead.has_previous_client_company && clientMatches.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center gap-2 text-green-800">
              <Crown className="h-4 w-4" />
              <strong>Analyse: Lead avec historique client détecté</strong>
            </div>
            <div className="text-sm text-green-700 mt-1">
              Ce lead a travaillé chez {clientMatches.length} de vos entreprises clientes.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientHistoryAnalyzer;
