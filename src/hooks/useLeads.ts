import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useAuth } from './useAuth';

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
  contacted_by_user_id?: string;
  contacted_by_user_name?: string;
  has_booked_appointment?: boolean;
  appointment_booked_at?: string;
  positive_response_at?: string;
  positive_response_by_user_id?: string;
  positive_response_notes?: string;
}

export const useLeads = () => {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('7days');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('exclude_2weeks');
  const [selectedUserContactFilter, setSelectedUserContactFilter] = useState<string>('all'); // all, only_me, exclude_me
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const { isAdmin } = useUserRole();
  const { user } = useAuth();

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

  // Fonction pour appliquer le filtre de date
  const applyDateFilter = (leads: Lead[], dateFilter: string): Lead[] => {
    if (dateFilter === 'all') return leads;

    const now = new Date();
    const cutoffDate = new Date();
    
    switch (dateFilter) {
      case '24h':
        cutoffDate.setHours(now.getHours() - 24);
        break;
      case '48h':
        cutoffDate.setHours(now.getHours() - 48);
        break;
      case '7days':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      default:
        return leads;
    }
    
    return leads.filter(lead => {
      const postDate = lead.latest_post_date || lead.posted_at_iso;
      if (!postDate) {
        console.log('🚫 Lead without date:', lead.id, lead.author_name);
        return false;
      }
      
      const leadDate = new Date(postDate);
      const passes = leadDate >= cutoffDate;
      
      if (!passes) {
        const hoursDiff = (now.getTime() - leadDate.getTime()) / (1000 * 60 * 60);
        console.log(`⏰ Lead filtered out (${dateFilter}): ${lead.author_name}, posted ${Math.round(hoursDiff)}h ago`);
      }
      
      return passes;
    });
  };

  // Fonction pour appliquer le filtre de contact
  const applyContactFilter = (leads: Lead[], contactFilter: string): Lead[] => {
    if (contactFilter === 'exclude_none') return leads;

    const now = new Date();
    
    return leads.filter(lead => {
      const hasLinkedInMessage = !!lead.linkedin_message_sent_at;
      const hasPhoneContact = !!lead.phone_contact_status;
      const hasLastContact = !!lead.last_contact_at;
      
      if (!hasLinkedInMessage && !hasPhoneContact && !hasLastContact) {
        return true;
      }

      let lastContactDate: Date | null = null;
      
      if (lead.linkedin_message_sent_at) {
        const linkedInDate = new Date(lead.linkedin_message_sent_at);
        if (!lastContactDate || linkedInDate > lastContactDate) {
          lastContactDate = linkedInDate;
        }
      }
      
      if (lead.last_contact_at) {
        const contactDate = new Date(lead.last_contact_at);
        if (!lastContactDate || contactDate > lastContactDate) {
          lastContactDate = contactDate;
        }
      }

      if (!lastContactDate) return true;

      const daysSinceContact = (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24);

      switch (contactFilter) {
        case 'exclude_1week':
          const result1w = daysSinceContact > 7;
          if (!result1w) {
            console.log(`📞 Lead filtered out (1 week): ${lead.author_name}, contacted ${Math.round(daysSinceContact)} days ago`);
          }
          return result1w;
        case 'exclude_2weeks':
          return daysSinceContact > 14;
        case 'exclude_1month':
          return daysSinceContact > 30;
        case 'exclude_all_contacted':
          const resultAll = !hasLinkedInMessage && !hasPhoneContact && !hasLastContact;
          if (!resultAll) {
            console.log(`📞 Lead filtered out (all contacted): ${lead.author_name}, has contact`);
          }
          return resultAll;
        default:
          return true;
      }
    });
  };

  // Fonction pour appliquer le filtre de contact
  const applyUserContactFilter = (leads: Lead[], userContactFilter: string): Lead[] => {
    if (userContactFilter === 'all' || !user) return leads;

    return leads.filter(lead => {
      const contactedByCurrentUser = lead.contacted_by_user_id === user.id;
      
      switch (userContactFilter) {
        case 'only_me':
          return contactedByCurrentUser;
        case 'exclude_me':
          return !contactedByCurrentUser;
        default:
          return true;
      }
    });
  };

  // Fonction pour appliquer tous les filtres
  const applyAllFilters = () => {
    console.log('🎯 Starting filter application...');
    console.log('📊 Total leads to filter:', allLeads.length);
    console.log('🏷️ Selected categories:', selectedCategories);
    console.log('📅 Date filter:', selectedDateFilter);
    console.log('📞 Contact filter:', selectedContactFilter);
    console.log('👤 User contact filter:', selectedUserContactFilter);

    let result = [...allLeads];
    const initialCount = result.length;

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
    const beforeDate = result.length;
    result = applyDateFilter(result, selectedDateFilter);
    console.log(`📅 After date filter (${selectedDateFilter}): ${beforeDate} -> ${result.length} leads`);

    // Filtre par statut de contact
    const beforeContact = result.length;
    result = applyContactFilter(result, selectedContactFilter);
    console.log(`📞 After contact filter (${selectedContactFilter}): ${beforeContact} -> ${result.length} leads`);

    const beforeUserContact = result.length;
    result = applyUserContactFilter(result, selectedUserContactFilter);
    console.log(`👤 After user contact filter (${selectedUserContactFilter}): ${beforeUserContact} -> ${result.length} leads`);

    console.log(`✅ Final filtered result: ${result.length} leads (from ${initialCount} total)`);
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
  }, [allLeads, selectedCategories, selectedDateFilter, selectedContactFilter, selectedUserContactFilter, user]);

  // Débogage : log des changements de filtres
  useEffect(() => {
    console.log('🎛️ Filter state changed:', {
      categories: selectedCategories,
      date: selectedDateFilter,
      contact: selectedContactFilter,
      userContact: selectedUserContactFilter,
      totalLeads: allLeads.length,
      filteredCount: filteredLeads.length
    });
  }, [selectedCategories, selectedDateFilter, selectedContactFilter, selectedUserContactFilter, allLeads.length, filteredLeads.length]);

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
    selectedUserContactFilter,
    setSelectedUserContactFilter,
    availableCategories,
    refreshLeads
  };
};
