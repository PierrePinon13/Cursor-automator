
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

export const useClientLeads = () => {
  const [clientLeads, setClientLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientLeads();
  }, []);

  const fetchClientLeads = async () => {
    try {
      console.log('🔍 Fetching client leads...');
      
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('is_client_lead', true)
        .order('latest_post_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching client leads:', error);
        throw error;
      }
      
      console.log(`📋 Fetched ${leads?.length || 0} client leads`);
      setClientLeads(leads || []);
    } catch (error) {
      console.error('💥 Error fetching client leads:', error);
      setClientLeads([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    clientLeads,
    loading,
    refreshClientLeads: fetchClientLeads
  };
};
