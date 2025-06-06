
import React from 'react';
import { AlertTriangle, Building2, Crown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClientHistoryAlertProps {
  lead: {
    is_client_lead?: boolean;
    matched_client_name?: string;
    has_previous_client_company?: boolean;
    client_history_alert?: string;
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

  // Si le lead a travaillé chez des clients dans le passé, utiliser l'alerte pré-générée
  if (lead.has_previous_client_company && lead.client_history_alert) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <Crown className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="flex items-center gap-2 mb-1">
            <strong>Entreprise cliente précédente détectée</strong>
            <Crown className="h-4 w-4" />
          </div>
          <div className="text-sm">
            {lead.client_history_alert}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default ClientHistoryAlert;
