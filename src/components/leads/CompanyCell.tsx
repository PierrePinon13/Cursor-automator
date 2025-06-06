
import React from 'react';
import CompanyHoverCard from './CompanyHoverCard';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

interface CompanyCellProps {
  lead: Lead;
}

const CompanyCell = ({ lead }: CompanyCellProps) => {
  // Priorité pour le nom de l'entreprise
  const companyName = lead.unipile_company || 
                     lead.company_name || 
                     lead.company_1_name || 
                     'Entreprise inconnue';
  
  // Priorité pour l'ID de l'entreprise
  const companyId = lead.company_id;
  
  // Priorité pour le LinkedIn ID
  const companyLinkedInId = lead.unipile_company_linkedin_id || 
                           lead.company_linkedin_id ||
                           lead.company_1_linkedin_id;

  console.log('🏢 CompanyCell rendering:', {
    companyName,
    companyId,
    companyLinkedInId,
    leadId: lead.id,
    allCompanyData: {
      unipile_company: lead.unipile_company,
      company_name: lead.company_name,
      company_1_name: lead.company_1_name,
      company_id: lead.company_id,
      unipile_company_linkedin_id: lead.unipile_company_linkedin_id,
      company_linkedin_id: lead.company_linkedin_id,
      company_1_linkedin_id: lead.company_1_linkedin_id
    }
  });

  return (
    <CompanyHoverCard 
      companyId={companyId}
      companyLinkedInId={companyLinkedInId}
      companyName={companyName}
    >
      <span className="text-sm font-medium">{companyName}</span>
    </CompanyHoverCard>
  );
};

export default CompanyCell;
