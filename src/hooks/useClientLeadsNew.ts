
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'> & {
  client?: {
    id: string;
    company_name: string;
    tier: string | null;
  };
  apify_dataset_id?: string;
};

export const useClientLeadsNew = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('7days');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('exclude_none');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClientLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, selectedCategories, selectedDateFilter, selectedContactFilter, searchQuery]);

  useEffect(() => {
    // Extract unique categories from leads, excluding "Autre"
    const categories = [...new Set(
      leads.map(lead => lead.openai_step3_categorie).filter(Boolean).filter(category => category && category !== 'Autre')
    )];
    setAvailableCategories(categories);
    
    // If no categories are selected, select all available ones
    if (selectedCategories.length === 0 && categories.length > 0) {
      setSelectedCategories(categories);
    }
  }, [leads]);

  const fetchClientLeads = async () => {
    try {
      console.log('🔍 Fetching client leads with enriched data...');
      
      const { data: clientLeads, error } = await supabase
        .from('leads')
        .select(`
          *,
          client:clients!leads_matched_client_id_fkey (
            id,
            company_name,
            tier
          )
        `)
        .eq('is_client_lead', true)
        .neq('openai_step3_categorie', 'Autre') // Exclure la catégorie "Autre"
        .order('latest_post_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching client leads:', error);
        throw error;
      }

      // Enrichir avec les données du dataset depuis linkedin_posts si disponible
      const enrichedLeads = await Promise.all(
        (clientLeads || []).map(async (lead) => {
          try {
            const { data: linkedinPost } = await supabase
              .from('linkedin_posts')
              .select('apify_dataset_id')
              .eq('lead_id', lead.id)
              .single();

            return {
              ...lead,
              apify_dataset_id: linkedinPost?.apify_dataset_id
            };
          } catch (error) {
            console.warn(`Could not fetch dataset info for lead ${lead.id}`);
            return lead;
          }
        })
      );
      
      console.log(`📋 Fetched ${enrichedLeads.length} enriched client leads (excluding "Autre" category)`);
      setLeads(enrichedLeads);
    } catch (error) {
      console.error('💥 Error fetching client leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilterCutoff = (filter: string): Date | null => {
    const now = new Date();
    
    switch (filter) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '48h':
        return new Date(now.getTime() - 48 * 60 * 60 * 1000);
      case '7days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'all':
      default:
        return null;
    }
  };

  const getContactExclusionCutoff = (filter: string): Date | null => {
    const now = new Date();
    
    switch (filter) {
      case 'exclude_1week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'exclude_2weeks':
        return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      case 'exclude_1month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'exclude_all_contacted':
        return new Date(0);
      case 'exclude_none':
      default:
        return null;
    }
  };

  const filterLeads = () => {
    let filtered = leads;
    console.log(`🔄 Starting to filter ${leads.length} client leads`);

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.author_name?.toLowerCase().includes(query) ||
        lead.text?.toLowerCase().includes(query) ||
        lead.matched_client_name?.toLowerCase().includes(query) ||
        lead.client?.company_name?.toLowerCase().includes(query) ||
        lead.unipile_company?.toLowerCase().includes(query) ||
        lead.openai_step3_postes_selectionnes?.some(poste => 
          poste.toLowerCase().includes(query)
        )
      );
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      const beforeCategoryFilter = filtered.length;
      filtered = filtered.filter(lead => 
        selectedCategories.includes(lead.openai_step3_categorie || '')
      );
      console.log(`🏷️ Category filter: ${beforeCategoryFilter} → ${filtered.length} leads`);
    }

    // Filter by date
    const dateCutoff = getDateFilterCutoff(selectedDateFilter);
    if (dateCutoff) {
      const beforeDateFilter = filtered.length;
      filtered = filtered.filter(lead => {
        let leadDate: Date;
        if (lead.posted_at_timestamp) {
          leadDate = new Date(lead.posted_at_timestamp);
        } else if (lead.posted_at_iso) {
          leadDate = new Date(lead.posted_at_iso);
        } else {
          leadDate = new Date(lead.created_at);
        }
        return leadDate >= dateCutoff;
      });
      console.log(`📅 Date filter (${selectedDateFilter}): ${beforeDateFilter} → ${filtered.length} leads`);
    }

    // Filter by contact status
    const contactExclusionCutoff = getContactExclusionCutoff(selectedContactFilter);
    if (contactExclusionCutoff !== null) {
      const beforeContactFilter = filtered.length;
      if (selectedContactFilter === 'exclude_all_contacted') {
        filtered = filtered.filter(lead => lead.last_contact_at === null);
      } else if (selectedContactFilter !== 'exclude_none') {
        filtered = filtered.filter(lead => {
          if (!lead.last_contact_at) return true;
          const contactDate = new Date(lead.last_contact_at);
          return contactDate < contactExclusionCutoff;
        });
      }
      console.log(`📞 Contact filter (${selectedContactFilter}): ${beforeContactFilter} → ${filtered.length} leads`);
    }

    // Sort filtered leads by date
    filtered.sort((a, b) => {
      const dateA = a.posted_at_timestamp || 
                   (a.posted_at_iso ? new Date(a.posted_at_iso).getTime() : 0) ||
                   new Date(a.created_at).getTime();
      const dateB = b.posted_at_timestamp || 
                   (b.posted_at_iso ? new Date(b.posted_at_iso).getTime() : 0) ||
                   new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    console.log(`✅ Final filtered client leads: ${filtered.length} leads`);
    setFilteredLeads(filtered);
  };

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
    searchQuery,
    setSearchQuery,
    refreshLeads: fetchClientLeads
  };
};
