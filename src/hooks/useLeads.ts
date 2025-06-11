
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
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('all');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const { isAdmin } = useUserRole();

  // Fonction pour récupérer les leads depuis la base de données
  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching all leads from database...');
      
      let query = supabase
        .from('leads')
        .select('*')
        .neq('processing_status', 'filtered_hr_provider')
        .neq('processing_status', 'mistargeted')
        .order('latest_post_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching leads:', error);
        return;
      }

      if (data) {
        console.log(`✅ Fetched ${data.length} leads from database`);
        setAllLeads(data);
        
        // Extraire les catégories uniques pour les filtres
        const categories = [...new Set(data
          .map(lead => lead.openai_step3_categorie)
          .filter(Boolean)
        )];
        setAvailableCategories(categories);
        console.log('📋 Available categories:', categories);
      }
    } catch (error) {
      console.error('❌ Error in fetchLeads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour appliquer tous les filtres
  const applyAllFilters = () => {
    console.log('🎯 Starting filter application...');
    console.log('📊 Total leads to filter:', allLeads.length);
    console.log('🏷️ Selected categories:', selectedCategories);
    console.log('📅 Date filter:', selectedDateFilter);
    console.log('📞 Contact filter:', selectedContactFilter);

    let result = [...allLeads];

    // Filtre par catégorie
    if (selectedCategories.length > 0) {
      const beforeCategory = result.length;
      result = result.filter(lead => {
        const category = lead.openai_step3_categorie || '';
        return selectedCategories.includes(category);
      });
      console.log(`🏷️ After category filter: ${beforeCategory} -> ${result.length} leads`);
    }

    // Filtre par date
    if (selectedDateFilter !== 'all') {
      const beforeDate = result.length;
      const currentTime = new Date().getTime();
      
      result = result.filter(lead => {
        const postDate = lead.latest_post_date || lead.posted_at_iso;
        if (!postDate) return false;
        
        const leadTime = new Date(postDate).getTime();
        const timeDiff = currentTime - leadTime;
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        switch (selectedDateFilter) {
          case 'today':
            return daysDiff <= 1;
          case 'week':
            return daysDiff <= 7;
          case 'month':
            return daysDiff <= 30;
          default:
            return true;
        }
      });
      console.log(`📅 After date filter (${selectedDateFilter}): ${beforeDate} -> ${result.length} leads`);
    }

    // Filtre par statut de contact
    if (selectedContactFilter !== 'all') {
      const beforeContact = result.length;
      
      result = result.filter(lead => {
        const hasLinkedInMessage = !!lead.linkedin_message_sent_at;
        const hasPhoneContact = !!lead.phone_contact_status;
        const hasAnyContact = hasLinkedInMessage || hasPhoneContact || !!lead.last_contact_at;

        switch (selectedContactFilter) {
          case 'contacted':
            return hasAnyContact;
          case 'not_contacted':
            return !hasAnyContact;
          default:
            return true;
        }
      });
      console.log(`📞 After contact filter (${selectedContactFilter}): ${beforeContact} -> ${result.length} leads`);
    }

    console.log(`✅ Final filtered result: ${result.length} leads`);
    setFilteredLeads(result);
  };

  const refreshLeads = () => {
    console.log('🔄 Refreshing leads...');
    fetchLeads();
  };

  // Effet pour charger les leads au démarrage
  useEffect(() => {
    console.log('🚀 Initial load of leads');
    fetchLeads();
  }, []);

  // Effet pour appliquer les filtres quand les données ou les filtres changent
  useEffect(() => {
    if (allLeads.length > 0) {
      console.log('🔄 Applying filters due to data or filter change');
      applyAllFilters();
    }
  }, [allLeads, selectedCategories, selectedDateFilter, selectedContactFilter]);

  // Débogage : log des changements de filtres
  useEffect(() => {
    console.log('🎛️ Filter state changed:', {
      categories: selectedCategories,
      date: selectedDateFilter,
      contact: selectedContactFilter,
      totalLeads: allLeads.length,
      filteredCount: filteredLeads.length
    });
  }, [selectedCategories, selectedDateFilter, selectedContactFilter, allLeads.length, filteredLeads.length]);

  return {
    leads: allLeads,
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
