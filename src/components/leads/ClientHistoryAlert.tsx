
import React from 'react';
import { AlertTriangle, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ClientHistoryAlertProps {
  lead: {
    has_previous_client_company?: boolean;
    previous_client_companies?: string[];
    matched_client_name?: string;
    is_client_lead?: boolean;
  };
}

const ClientHistoryAlert = ({ lead }: ClientHistoryAlertProps) => {
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

  // Si le lead a travaillé chez des clients dans le passé, afficher les entreprises spécifiques
  if (lead.has_previous_client_company && lead.previous_client_companies?.length) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Entreprise cliente précédente détectée :</strong>
          <div className="flex flex-wrap gap-2 mt-2">
            {lead.previous_client_companies.map((company, index) => (
              <Badge key={index} variant="outline" className="text-orange-700 border-orange-300 bg-orange-100">
                {company}
              </Badge>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default ClientHistoryAlert;
