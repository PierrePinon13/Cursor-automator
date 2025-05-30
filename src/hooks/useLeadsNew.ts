
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Lead {
  id: string;
  author_profile_id: string;
  author_name: string;
  author_headline: string;
  author_profile_url: string;
  company_name: string;
  company_position: string;
  company_linkedin_id: string;
  phone_number?: string | null;
  phone_retrieved_at?: string | null;
  approach_message?: string | null;
  approach_message_generated?: boolean | null;
  approach_message_generated_at?: string | null;
  is_client_lead?: boolean | null;
  matched_client_name?: string | null;
  matched_client_id?: string | null;
  last_contact_at?: string | null;
  linkedin_message_sent_at?: string | null;
  phone_contact_status?: string | null;
  phone_contact_at?: string | null;
  phone_contact_by_user_id?: string | null;
  phone_contact_by_user_name?: string | null;
  created_at: string;
  updated_at: string;
  last_updated_at?: string | null;
  // Informations des posts associés
  posts?: LinkedInPost[];
  // Post le plus récent pour l'affichage
  latest_post?: LinkedInPost;
}

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

export const useLeadsNew = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('7days');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('exclude_2weeks');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, selectedCategories, selectedDateFilter, selectedContactFilter]);

  useEffect(() => {
    // Extract unique categories from leads
    const categories = [...new Set(
      leads.flatMap(lead => 
        lead.posts?.map(post => post.openai_step3_categorie).filter(Boolean) || []
      ).filter(category => category && category !== 'Autre')
    )];
    setAvailableCategories(categories);
    
    // If no categories are selected, select all available ones
    if (selectedCategories.length === 0 && categories.length > 0) {
      setSelectedCategories(categories);
    }
  }, [leads]);

  const fetchLeads = async () => {
    try {
      console.log('🔍 Fetching leads with associated posts...');
      
      // Fetch leads avec leurs posts associés
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          posts:linkedin_posts!lead_id(
            id,
            text,
            title,
            url,
            posted_at_iso,
            posted_at_timestamp,
            openai_step2_localisation,
            openai_step3_categorie,
            openai_step3_postes_selectionnes,
            openai_step3_justification,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('❌ Error fetching leads:', leadsError);
        throw leadsError;
      }
      
      console.log(`📋 Fetched ${leadsData?.length || 0} leads`);
      
      // Enrichir chaque lead avec le post le plus récent pour l'affichage
      const enrichedLeads = leadsData?.map(lead => ({
        ...lead,
        latest_post: lead.posts?.length > 0 
          ? lead.posts.sort((a: LinkedInPost, b: LinkedInPost) => {
              const dateA = a.posted_at_timestamp || new Date(a.posted_at_iso || a.created_at).getTime();
              const dateB = b.posted_at_timestamp || new Date(b.posted_at_iso || b.created_at).getTime();
              return dateB - dateA;
            })[0]
          : null
      })) || [];
      
      setLeads(enrichedLeads);
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

    // Filter by categories
    if (selectedCategories.length > 0) {
      const beforeCategoryFilter = filtered.length;
      filtered = filtered.filter(lead => 
        lead.posts?.some(post => 
          selectedCategories.includes(post.openai_step3_categorie || '')
        )
      );
      console.log(`🏷️ Category filter: ${beforeCategoryFilter} → ${filtered.length} leads`);
    }

    // Filter by date (using latest post date)
    const dateCutoff = getDateFilterCutoff(selectedDateFilter);
    if (dateCutoff) {
      const beforeDateFilter = filtered.length;
      filtered = filtered.filter(lead => {
        if (!lead.latest_post) return false;
        
        let leadDate: Date;
        if (lead.latest_post.posted_at_timestamp) {
          leadDate = new Date(lead.latest_post.posted_at_timestamp);
        } else if (lead.latest_post.posted_at_iso) {
          leadDate = new Date(lead.latest_post.posted_at_iso);
        } else {
          leadDate = new Date(lead.latest_post.created_at);
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

    // Sort filtered leads by latest post date
    filtered.sort((a, b) => {
      const dateA = a.latest_post?.posted_at_timestamp || 
                   (a.latest_post?.posted_at_iso ? new Date(a.latest_post.posted_at_iso).getTime() : 0) ||
                   new Date(a.created_at).getTime();
      const dateB = b.latest_post?.posted_at_timestamp || 
                   (b.latest_post?.posted_at_iso ? new Date(b.latest_post.posted_at_iso).getTime() : 0) ||
                   new Date(b.created_at).getTime();
      return dateB - dateA;
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
    refreshLeads: fetchLeads
  };
};
