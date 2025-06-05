
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

export const useClientHistoryCheck = (leadId: string) => {
  const [clientHistory, setClientHistory] = useState<{
    hasPreviousClientCompany: boolean;
    previousClientCompanies: string[];
  }>({
    hasPreviousClientCompany: false,
    previousClientCompanies: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkClientHistory = async () => {
      if (!leadId) return;

      try {
        setLoading(true);

        // Récupérer le lead avec les informations d'entreprises
        const { data: lead, error } = await supabase
          .from('leads')
          .select(`
            id,
            company_1_name,
            company_2_name,
            company_3_name,
            company_4_name,
            company_5_name,
            company_1_linkedin_id,
            company_2_linkedin_id,
            company_3_linkedin_id,
            company_4_linkedin_id,
            company_5_linkedin_id,
            has_previous_client_company,
            previous_client_companies
          `)
          .eq('id', leadId)
          .single();

        if (error || !lead) {
          console.error('Error fetching lead:', error);
          return;
        }

        // Si on a déjà les informations, les utiliser
        if (lead.has_previous_client_company !== null && lead.previous_client_companies) {
          setClientHistory({
            hasPreviousClientCompany: lead.has_previous_client_company,
            previousClientCompanies: lead.previous_client_companies
          });
          return;
        }

        // Sinon, vérifier les entreprises passées
        const companyIds = [
          lead.company_1_linkedin_id,
          lead.company_2_linkedin_id,
          lead.company_3_linkedin_id,
          lead.company_4_linkedin_id,
          lead.company_5_linkedin_id
        ].filter(Boolean);

        if (companyIds.length === 0) {
          setClientHistory({
            hasPreviousClientCompany: false,
            previousClientCompanies: []
          });
          return;
        }

        // Vérifier quelles entreprises sont des clients
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('company_linkedin_id, company_name')
          .in('company_linkedin_id', companyIds);

        if (clientsError) {
          console.error('Error checking client companies:', clientsError);
          return;
        }

        const clientCompanies = clients?.map(c => c.company_name) || [];
        const hasPreviousClient = clientCompanies.length > 0;

        setClientHistory({
          hasPreviousClientCompany: hasPreviousClient,
          previousClientCompanies: clientCompanies
        });

        // Mettre à jour le lead avec ces informations
        if (hasPreviousClient || clientCompanies.length === 0) {
          await supabase
            .from('leads')
            .update({
              has_previous_client_company: hasPreviousClient,
              previous_client_companies: clientCompanies,
              last_updated_at: new Date().toISOString()
            })
            .eq('id', leadId);
        }

      } catch (error) {
        console.error('Error in client history check:', error);
      } finally {
        setLoading(false);
      }
    };

    checkClientHistory();
  }, [leadId]);

  return { clientHistory, loading };
};
