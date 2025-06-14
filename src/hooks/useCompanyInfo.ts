
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type CompanyInfo = {
  id: string;
  name?: string;
  linkedin_id?: string;
  description?: string;
  industry?: string;
  company_size?: string;
  headquarters?: string;
  website?: string;
  follower_count?: number;
};

interface UseCompanyInfoParams {
  companyId?: string | null;
  companyLinkedInId?: string | null;
  companyName?: string | null;
}

export function useCompanyInfo({ companyId, companyLinkedInId, companyName }: UseCompanyInfoParams) {
  return useQuery({
    queryKey: ['company-info', companyId, companyLinkedInId, companyName],
    queryFn: async (): Promise<CompanyInfo | null> => {
      // Sanitize inputs
      const id = companyId && companyId !== 'null' && companyId !== 'undefined' ? companyId : null;
      const lnId = companyLinkedInId && companyLinkedInId !== 'null' && companyLinkedInId !== 'undefined' && companyLinkedInId !== '0'
        ? companyLinkedInId
        : null;
      const name = companyName && companyName !== 'Entreprise inconnue' && companyName.trim() !== '' ? companyName.trim() : null;

      // Search order: id > linkedin_id > exact name > ilike name
      if (id) {
        const { data, error } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
        if (!error && data) return data;
      }
      if (lnId) {
        const { data, error } = await supabase.from('companies').select('*').eq('linkedin_id', lnId).maybeSingle();
        if (!error && data) return data;
      }
      if (name) {
        // Try exact
        let { data, error } = await supabase.from('companies').select('*').eq('name', name).maybeSingle();
        if (!error && data) return data;
        // Try ilike/contains
        ({ data, error } = await supabase.from('companies').select('*').ilike('name', `%${name}%`).limit(1).maybeSingle());
        if (!error && data) return data;
      }
      return null;
    },
    enabled: !!(companyId || companyLinkedInId || (companyName && companyName !== 'Entreprise inconnue')),
    staleTime: 10 * 60 * 1000
  });
}
