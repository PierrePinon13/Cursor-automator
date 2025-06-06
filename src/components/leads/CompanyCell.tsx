
import React from 'react';
import CompanyHoverCard from './CompanyHoverCard';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

interface CompanyCellProps {
  lead: Lead;
}

const CompanyCell = ({ lead }: CompanyCellProps) => {
  // Utiliser l'entreprise actuelle du lead
  const companyName = lead.unipile_company || lead.company_name || 'Entreprise inconnue';
  const companyId = lead.company_id;
  const companyLinkedInId = lead.unipile_company_linkedin_id || lead.company_linkedin_id;

  console.log('🏢 CompanyCell rendering:', {
    companyName,
    companyId,
    companyLinkedInId,
    leadId: lead.id
  });

  return (
    <CompanyHoverCard 
      companyId={companyId}
      companyLinkedInId={companyLinkedInId}
      companyName={companyName}
    >
      <span className="text-sm">{companyName}</span>
    </CompanyHoverCard>
  );
};

export default CompanyCell;
