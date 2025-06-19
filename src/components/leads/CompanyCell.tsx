
import React from 'react';
import CompanyHoverCard from './CompanyHoverCard';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

interface CompanyCellProps {
  lead: Lead;
}

const CompanyCell = ({ lead }: CompanyCellProps) => {
  // Priorité pour le nom de l'entreprise actuelle (company_1 = entreprise actuelle)
  const companyName = lead.company_1_name || 
                     lead.unipile_company || 
                     lead.company_name || 
                     'Entreprise inconnue';
  
  // Priorité pour l'ID de l'entreprise (UUID depuis la table companies)
  const companyId = lead.company_id;
  
  // Priorité pour le LinkedIn ID de l'entreprise actuelle
  const companyLinkedInId = lead.company_1_linkedin_id ||
                           lead.unipile_company_linkedin_id || 
                           lead.company_linkedin_id;

  console.log('🏢 CompanyCell rendering:', {
    leadId: lead.id,
    companyName,
    companyId,
    companyLinkedInId,
    company_1_data: {
      name: lead.company_1_name,
      linkedin_id: lead.company_1_linkedin_id,
      position: lead.company_1_position
    }
  });

  return (
    <CompanyHoverCard 
      companyId={companyId}
      companyLinkedInId={companyLinkedInId}
      companyName={companyName}
      showLogo={true}
    >
      <span className="text-sm font-medium">{companyName}</span>
    </CompanyHoverCard>
  );
};

export default CompanyCell;
