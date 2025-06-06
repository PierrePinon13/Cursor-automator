
import React from 'react';
import { AlertTriangle, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClientHistoryAlertProps {
  lead: {
    has_previous_client_company?: boolean;
    previous_client_companies?: any[];
    matched_client_name?: string;
    is_client_lead?: boolean;
  };
}

const ClientHistoryAlert = ({ lead }: ClientHistoryAlertProps) => {
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      // Gérer différents formats de date
      let date: Date;
      if (dateString.includes('-')) {
        // Format YYYY-MM ou YYYY-MM-DD
        date = new Date(dateString + (dateString.length === 7 ? '-01' : ''));
      } else if (dateString.length === 4) {
        // Format YYYY seulement
        date = new Date(dateString + '-01-01');
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return dateString; // Retourner la chaîne originale si parsing échoue
      }
      
      return date.toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return dateString || ''; // Fallback vers la chaîne originale
    }
  };

  // Si c'est un lead client actuel, afficher l'alerte principale
  if (lead.is_client_lead && lead.matched_client_name) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Building2 className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Lead Client Actuel :</strong> Travaille actuellement chez{' '}
          <span className="font-semibold">{lead.matched_client_name}</span>
        </AlertDescription>
      </Alert>
    );
  }

  // Si le lead a travaillé chez des clients dans le passé
  if (lead.has_previous_client_company && lead.previous_client_companies?.length) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="space-y-2">
            <strong>Entreprise cliente précédente détectée :</strong>
            {lead.previous_client_companies.map((clientCompany, index) => {
              console.log('🔍 Processing client company:', clientCompany);
              
              // Gérer différents formats de données
              let clientName = '';
              let startDate = '';
              let endDate = '';
              let position = '';
              
              if (typeof clientCompany === 'string') {
                // Format simple : juste le nom du client
                clientName = clientCompany;
              } else if (typeof clientCompany === 'object' && clientCompany !== null) {
                // Format objet avec détails
                clientName = clientCompany.client_name || clientCompany.company_name || '';
                startDate = clientCompany.start_date || '';
                endDate = clientCompany.end_date || '';
                position = clientCompany.position || '';
              }
              
              const formattedStartDate = formatDate(startDate);
              const formattedEndDate = formatDate(endDate);
              
              return (
                <div key={index} className="text-sm">
                  A travaillé chez{' '}
                  <span className="font-bold text-orange-900">{clientName}</span>
                  {formattedStartDate && formattedEndDate && (
                    <span> de {formattedStartDate} à {formattedEndDate}</span>
                  )}
                  {formattedStartDate && !formattedEndDate && (
                    <span> depuis {formattedStartDate}</span>
                  )}
                  {position && (
                    <span> en tant que {position}</span>
                  )}
                </div>
              );
            })}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default ClientHistoryAlert;
