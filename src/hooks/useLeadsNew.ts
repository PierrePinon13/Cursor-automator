
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

interface LinkedInPost {
  id: string;
  text: string;
  title?: string;
  url: string;
  posted_at_iso?: string;
  posted_at_timestamp?: number;
  openai_step2_localisation?: string;
  openai_step3_categorie?: string;
  openai_step3_postes_selectionnes?: string[];
  openai_step3_justification?: string;
  created_at: string;
}

interface SearchFilters {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useLeadsNew = (): {
  leads: Lead[];
  filteredLeads: Lead[];
  loading: boolean;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (filter: string) => void;
  selectedContactFilter: string;
  setSelectedContactFilter: (filter: string) => void;
  availableCategories: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  refreshLeads: () => Promise<void>;
} => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('7days');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('exclude_2weeks');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, selectedCategories, selectedDateFilter, selectedContactFilter, searchQuery]);

  useEffect(() => {
    // Extract unique categories from leads
    const categories = [...new Set(
      leads.map(lead => lead.openai_step3_categorie).filter(Boolean).filter(category => category && category !== 'Autre')
    )];
    setAvailableCategories(categories);
    
    // If no categories are selected, select all available ones
    if (selectedCategories.length === 0 && categories.length > 0) {
      setSelectedCategories(categories);
    }
  }, [leads]);

  const fetchLeads = async () => {
    try {
      console.log('🔍 Fetching leads with filters...');
      
      // Récupérer les IDs des publications mal ciblées
      const { data: mistargetedPosts, error: mistargetedError } = await supabase
        .from('mistargeted_posts')
        .select('lead_id');

      if (mistargetedError) {
        console.error('Error fetching mistargeted posts:', mistargetedError);
      }

      const mistargetedLeadIds = mistargetedPosts?.map(post => post.lead_id) || [];

      // Récupérer les noms des prestataires RH
      const { data: hrProviders, error: hrError } = await supabase
        .from('hr_providers')
        .select('company_name');

      if (hrError) {
        console.error('Error fetching HR providers:', hrError);
      }

      const hrProviderNames = hrProviders?.map(provider => provider.company_name.toLowerCase()) || [];

      // ✅ AMÉLIORATION : Requête avec plus de champs pour le debugging et correction des dates
      let query = supabase
        .from('leads')
        .select(`
          *,
          openai_step3_categorie,
          openai_step3_postes_selectionnes,
          openai_step3_justification,
          text,
          title,
          url,
          latest_post_url,
          posted_at_iso,
          posted_at_timestamp,
          latest_post_date,
          has_previous_client_company,
          previous_client_companies,
          apify_dataset_id
        `)
        .order('created_at', { ascending: false });

      // Exclure les publications mal ciblées
      if (mistargetedLeadIds.length > 0) {
        query = query.not('id', 'in', `(${mistargetedLeadIds.join(',')})`);
      }

      const { data: leadsData, error: leadsError } = await query;

      if (leadsError) {
        console.error('❌ Error fetching leads:', leadsError);
        throw leadsError;
      }
      
      // Filtrer les leads des prestataires RH
      const filteredLeads = (leadsData || []).filter(lead => {
        if (!lead.unipile_company) return true;
        return !hrProviderNames.includes(lead.unipile_company.toLowerCase());
      });

      console.log(`📋 Fetched ${filteredLeads.length} leads after filtering`);
      
      // ✅ DEBUG : Log des premiers leads pour vérifier les données de date
      if (filteredLeads.length > 0) {
        console.log('🔍 Debug - First few leads date data:', filteredLeads.slice(0, 3).map(lead => ({
          id: lead.id,
          name: lead.author_name,
          posted_at_iso: lead.posted_at_iso,
          posted_at_timestamp: lead.posted_at_timestamp,
          latest_post_date: lead.latest_post_date,
          created_at: lead.created_at,
          text_preview: lead.text?.substring(0, 50) || 'NO TEXT',
          apify_dataset_id: lead.apify_dataset_id,
          has_previous_client: lead.has_previous_client_company
        })));
      }
      
      console.log(`🔍 After filtering HR providers: ${filteredLeads.length} leads`);
      setLeads(filteredLeads);
    } catch (error) {
      console.error('💥 Error fetching leads:', error);
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
    console.log(`🔄 Starting to filter ${leads.length} leads`);

    // ✅ AMÉLIORATION : Filter by search query
    if (searchQuery.trim()) {
      const beforeSearchFilter = filtered.length;
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.author_name?.toLowerCase().includes(query) ||
        lead.company_name?.toLowerCase().includes(query) ||
        lead.unipile_company?.toLowerCase().includes(query) ||
        lead.text?.toLowerCase().includes(query) ||
        lead.openai_step3_categorie?.toLowerCase().includes(query) ||
        lead.openai_step3_postes_selectionnes?.some(poste => 
          poste.toLowerCase().includes(query)
        )
      );
      console.log(`🔍 Search filter ("${searchQuery}"): ${beforeSearchFilter} → ${filtered.length} leads`);
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      const beforeCategoryFilter = filtered.length;
      filtered = filtered.filter(lead => 
        selectedCategories.includes(lead.openai_step3_categorie || '')
      );
      console.log(`🏷️ Category filter: ${beforeCategoryFilter} → ${filtered.length} leads`);
    }

    // ✅ CORRECTION : Filter by date avec priorité aux bonnes données
    const dateCutoff = getDateFilterCutoff(selectedDateFilter);
    if (dateCutoff) {
      const beforeDateFilter = filtered.length;
      filtered = filtered.filter(lead => {
        let leadDate: Date;
        
        // ✅ PRIORITÉ : 1. posted_at_timestamp, 2. posted_at_iso, 3. latest_post_date, 4. created_at
        if (lead.posted_at_timestamp) {
          leadDate = new Date(lead.posted_at_timestamp);
        } else if (lead.posted_at_iso) {
          leadDate = new Date(lead.posted_at_iso);
        } else if (lead.latest_post_date) {
          leadDate = new Date(lead.latest_post_date);
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

    // ✅ CORRECTION : Sort filtered leads by date avec priorité aux bonnes données
    filtered.sort((a, b) => {
      // Priorité : posted_at_timestamp > posted_at_iso > latest_post_date > created_at
      const getTimestamp = (lead: Lead): number => {
        if (lead.posted_at_timestamp) return lead.posted_at_timestamp;
        if (lead.posted_at_iso) return new Date(lead.posted_at_iso).getTime();
        if (lead.latest_post_date) return new Date(lead.latest_post_date).getTime();
        return new Date(lead.created_at).getTime();
      };
      
      return getTimestamp(b) - getTimestamp(a); // Plus récent en premier
    });

    console.log(`✅ Final filtered results: ${filtered.length} leads`);
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
    refreshLeads: fetchLeads
  };
};
