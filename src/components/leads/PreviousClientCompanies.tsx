
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Building, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PreviousClientCompaniesProps {
  lead: any;
}

interface ClientCompany {
  companyName: string;
  position: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  linkedinId?: string;
  clientName?: string;
}

const PreviousClientCompanies = ({ lead }: PreviousClientCompaniesProps) => {
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkClientHistory = async () => {
      if (!lead) return;

      try {
        // Récupérer tous les LinkedIn IDs des entreprises du lead
        const companyLinkedInIds = [
          lead.company_1_linkedin_id,
          lead.company_2_linkedin_id,
          lead.company_3_linkedin_id,
          lead.company_4_linkedin_id,
          lead.company_5_linkedin_id
        ].filter(Boolean);

        if (companyLinkedInIds.length === 0) {
          setLoading(false);
          return;
        }

        // Vérifier quelles entreprises sont des clients
        const { data: clients, error } = await supabase
          .from('clients')
          .select('company_name, company_linkedin_id')
          .in('company_linkedin_id', companyLinkedInIds);

        if (error) {
          console.error('Error checking client companies:', error);
          setLoading(false);
          return;
        }

        // Construire la liste des entreprises clientes
        const foundClientCompanies: ClientCompany[] = [];

        for (let i = 1; i <= 5; i++) {
          const companyName = lead[`company_${i}_name`];
          const companyLinkedInId = lead[`company_${i}_linkedin_id`];
          const position = lead[`company_${i}_position`];
          const startDate = lead[`company_${i}_start_date`];
          const endDate = lead[`company_${i}_end_date`];
          const isCurrent = lead[`company_${i}_is_current`];

          if (companyName && companyLinkedInId) {
            // Vérifier si cette entreprise est un client
            const clientMatch = clients?.find(client => 
              client.company_linkedin_id === companyLinkedInId
            );

            if (clientMatch) {
              foundClientCompanies.push({
                companyName,
                position: position || 'Poste non spécifié',
                startDate,
                endDate,
                isCurrent: isCurrent || false,
                linkedinId: companyLinkedInId,
                clientName: clientMatch.company_name
              });
            }
          }
        }

        setClientCompanies(foundClientCompanies);
      } catch (error) {
        console.error('Error in client history check:', error);
      } finally {
        setLoading(false);
      }
    };

    checkClientHistory();
  }, [lead]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    
    try {
      let date: Date;
      
      if (dateString.includes('/')) {
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

  if (loading) {
    return null;
  }

  if (clientCompanies.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 p-4 mx-6 mb-4 rounded-lg">
      <div className="flex items-start gap-3 text-yellow-800">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <Crown className="h-5 w-5 text-yellow-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 mb-3">
            Entreprise cliente précédente détectée
          </h3>
          <div className="space-y-3">
            {clientCompanies.map((company, index) => (
              <div key={index} className="bg-white border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-900">
                        {company.companyName}
                      </span>
                      <Badge variant="default" className="bg-yellow-600 text-white text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        Client
                      </Badge>
                      {company.isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Actuel
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-yellow-700 mb-2">
                      {company.position}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <Calendar className="h-3 w-3" />
                      {formatDate(company.startDate) || 'Date inconnue'} - {
                        company.isCurrent ? 'Présent' : (formatDate(company.endDate) || 'Date inconnue')
                      }
                    </div>
                    {company.linkedinId && (
                      <div className="text-xs text-yellow-500 font-mono mt-1">
                        LinkedIn ID: {company.linkedinId}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviousClientCompanies;
