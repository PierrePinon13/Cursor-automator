import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export interface LeadNew {
  id: string;
  author_name: string;
  author_headline?: string;
  author_profile_url?: string;
  unipile_company?: string;
  unipile_position?: string;
  openai_step2_localisation?: string;
  openai_step3_categorie?: string;
  openai_step3_postes_selectionnes?: string[];
  posted_at_iso?: string;
  latest_post_date?: string;
  last_contact_at?: string;
  last_updated_at?: string;
  phone_number?: string;
  phone_contact_status?: string;
  linkedin_message_sent_at?: string;
  assigned_to_user_id?: string;
  assignment_completed_at?: string;
  processing_status?: string;
  is_client_lead?: boolean;
  matched_client_name?: string;
  locked_by_user_id?: string;
  locked_by_user_name?: string;
  locked_at?: string;
  title?: string;
  text?: string;
  url?: string;
  approach_message?: string;
  approach_message_generated?: boolean;
  client_history_alert?: string;
  matched_hr_provider_id?: string;
  matched_hr_provider_name?: string;
}

export const useLeadsNew = () => {
  const [leads, setLeads] = useState<LeadNew[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('all');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const { isAdmin } = useUserRole();

  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('leads')
        .select('*')
        // Exclure les leads filtrés comme prestataires RH et mal ciblés
        .neq('processing_status', 'filtered_hr_provider')
        .neq('processing_status', 'mistargeted')
        .order('latest_post_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching leads:', error);
        return;
      }

      if (data) {
        console.log(`Fetched ${data.length} leads (HR providers and mistargeted filtered out)`);
        setLeads(data);
        
        // Extract unique categories
        const categories = [...new Set(data
          .map(lead => lead.openai_step3_categorie)
          .filter(Boolean)
        )];
        setAvailableCategories(categories);
      }
    } catch (error) {
      console.error('Error in fetchLeads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter leads based on selected criteria
  const filteredLeads = leads.filter(lead => {
    // Category filter
    if (selectedCategories.length > 0 && !selectedCategories.includes(lead.openai_step3_categorie || '')) {
      return false;
    }

    // Date filter
    if (selectedDateFilter !== 'all') {
      const leadDate = new Date(lead.latest_post_date || lead.posted_at_iso || '');
      const now = new Date();
      const diffTime = now.getTime() - leadDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (selectedDateFilter) {
        case 'today':
          if (diffDays > 1) return false;
          break;
        case 'week':
          if (diffDays > 7) return false;
          break;
        case 'month':
          if (diffDays > 30) return false;
          break;
      }
    }

    // Contact filter
    if (selectedContactFilter !== 'all') {
      const hasContact = lead.last_contact_at || lead.phone_contact_status || lead.linkedin_message_sent_at;
      
      switch (selectedContactFilter) {
        case 'contacted':
          if (!hasContact) return false;
          break;
        case 'not_contacted':
          if (hasContact) return false;
          break;
      }
    }

    return true;
  });

  const refreshLeads = () => {
    fetchLeads();
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return {
    leads,
    filteredLeads,
    loading,
    selectedCategories,
    setSelectedCategories,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedContactFilter,
    setSelectedContactFilter,
    availableCategories,
    refreshLeads
  };
};
