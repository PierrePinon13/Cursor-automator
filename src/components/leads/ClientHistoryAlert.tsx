
import React from 'react';
import { AlertTriangle, Building2, Crown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClientHistoryAlertProps {
  lead: {
    has_previous_client_company?: boolean;
    matched_client_name?: string;
    is_client_lead?: boolean;
    // Colonnes des 5 entreprises
    company_1_name?: string;
    company_1_position?: string;
    company_1_start_date?: string;
    company_1_end_date?: string;
    company_1_is_current?: boolean;
    company_2_name?: string;
    company_2_position?: string;
    company_2_start_date?: string;
    company_2_end_date?: string;
    company_2_is_current?: boolean;
    company_3_name?: string;
    company_3_position?: string;
    company_3_start_date?: string;
    company_3_end_date?: string;
    company_3_is_current?: boolean;
    company_4_name?: string;
    company_4_position?: string;
    company_4_start_date?: string;
    company_4_end_date?: string;
    company_4_is_current?: boolean;
    company_5_name?: string;
    company_5_position?: string;
    company_5_start_date?: string;
    company_5_end_date?: string;
    company_5_is_current?: boolean;
  };
}

const ClientHistoryAlert = ({ lead }: ClientHistoryAlertProps) => {
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      let date: Date;
      if (dateString.includes('/')) {
        // Format M/D/YYYY
        const [month, day, year] = dateString.split('/');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (dateString.includes('-')) {
        // Format YYYY-MM ou YYYY-MM-DD
        date = new Date(dateString + (dateString.length === 7 ? '-01' : ''));
      } else if (dateString.length === 4) {
        // Format YYYY seulement
        date = new Date(dateString + '-01-01');
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      return date.toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return dateString || '';
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

  // Si le lead a travaillé chez des clients dans le passé, analyser les colonnes company_1 à company_5
  if (lead.has_previous_client_company) {
    // On va afficher les informations depuis les colonnes structurées
    const clientCompanies = [];
    
    // Parcourir les 5 entreprises pour trouver celles qui sont des clients
    for (let i = 1; i <= 5; i++) {
      const companyName = lead[`company_${i}_name` as keyof typeof lead] as string;
      const position = lead[`company_${i}_position` as keyof typeof lead] as string;
      const startDate = lead[`company_${i}_start_date` as keyof typeof lead] as string;
      const endDate = lead[`company_${i}_end_date` as keyof typeof lead] as string;
      const isCurrent = lead[`company_${i}_is_current` as keyof typeof lead] as boolean;
      
      if (companyName) {
        clientCompanies.push({
          name: companyName,
          position,
          startDate,
          endDate,
          isCurrent
        });
      }
    }

    if (clientCompanies.length > 0) {
      return (
        <Alert className="border-orange-200 bg-orange-50">
          <Crown className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <strong>Entreprise cliente précédente détectée</strong>
                <Crown className="h-4 w-4" />
              </div>
              {clientCompanies.map((company, index) => {
                const formattedStartDate = formatDate(company.startDate);
                const formattedEndDate = formatDate(company.endDate);
                
                return (
                  <div key={index} className="text-sm">
                    A travaillé chez{' '}
                    <span className="font-bold text-orange-900">{company.name}</span>
                    {company.position && (
                      <span> en tant que <span className="font-medium">{company.position}</span></span>
                    )}
                    {formattedStartDate && formattedEndDate && (
                      <span> de {formattedStartDate} à {formattedEndDate}</span>
                    )}
                    {formattedStartDate && !formattedEndDate && company.isCurrent && (
                      <span> depuis {formattedStartDate} (actuel)</span>
                    )}
                  </div>
                );
              })}
            </div>
          </AlertDescription>
        </Alert>
      );
    }
  }

  return null;
};

export default ClientHistoryAlert;
