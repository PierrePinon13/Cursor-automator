
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export interface Lead {
  id: string;
  author_name: string;
  author_headline?: string;
  author_profile_url?: string;
  company_name?: string;
  company_position?: string;
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

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('all');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const { isAdmin } = useUserRole();

  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching leads with filters...');
      
      let query = supabase
        .from('leads')
        .select('*')
        // Exclure les leads filtrés comme prestataires RH et mal ciblés
        .neq('processing_status', 'filtered_hr_provider')
        .neq('processing_status', 'mistargeted')
        .order('latest_post_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching leads:', error);
        return;
      }

      if (data) {
        console.log(`✅ Fetched ${data.length} leads`);
        console.log('🔍 Filtered leads (excluding HR providers and mistargeted):', data.length);
        
        // Log des leads avec processing_status pour debug
        const statusCounts = data.reduce((acc: any, lead) => {
          const status = lead.processing_status || 'undefined';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        console.log('📊 Leads by processing status:', statusCounts);
        
        setLeads(data);
        
        // Extract unique categories
        const categories = [...new Set(data
          .map(lead => lead.openai_step3_categorie)
          .filter(Boolean)
        )];
        setAvailableCategories(categories);
      }
    } catch (error) {
      console.error('❌ Error in fetchLeads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter leads based on selected criteria
  const applyFilters = () => {
    let filtered = leads;
    
    console.log('🔧 Applying filters to', leads.length, 'leads');
    console.log('🔧 Selected categories:', selectedCategories);
    console.log('🔧 Selected date filter:', selectedDateFilter);
    console.log('🔧 Selected contact filter:', selectedContactFilter);

    // Category filter
    if (selectedCategories.length > 0) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(lead => selectedCategories.includes(lead.openai_step3_categorie || ''));
      console.log(`🏷️ Category filter: ${beforeCount} → ${filtered.length} leads`);
    }

    // Date filter
    if (selectedDateFilter !== 'all') {
      const beforeCount = filtered.length;
      const now = new Date();
      
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.latest_post_date || lead.posted_at_iso || '');
        const diffTime = now.getTime() - leadDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (selectedDateFilter) {
          case 'today':
            return diffDays <= 1;
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          default:
            return true;
        }
      });
      console.log(`📅 Date filter (${selectedDateFilter}): ${beforeCount} → ${filtered.length} leads`);
    }

    // Contact filter
    if (selectedContactFilter !== 'all') {
      const beforeCount = filtered.length;
      
      filtered = filtered.filter(lead => {
        const hasContact = lead.last_contact_at || lead.phone_contact_status || lead.linkedin_message_sent_at;
        
        switch (selectedContactFilter) {
          case 'contacted':
            return !!hasContact;
          case 'not_contacted':
            return !hasContact;
          default:
            return true;
        }
      });
      console.log(`📞 Contact filter (${selectedContactFilter}): ${beforeCount} → ${filtered.length} leads`);
    }

    console.log(`✅ Final filtered leads: ${filtered.length} leads`);
    setFilteredLeads(filtered);
  };

  const refreshLeads = () => {
    fetchLeads();
  };

  // Apply filters whenever leads or filter criteria change
  useEffect(() => {
    applyFilters();
  }, [leads, selectedCategories, selectedDateFilter, selectedContactFilter]);

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
