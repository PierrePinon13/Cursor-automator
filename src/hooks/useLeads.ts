
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Lead {
  id: string;
  created_at: string;
  author_name: string;
  author_headline: string;
  author_profile_url: string;
  text: string;
  title: string;
  url: string;
  posted_at_iso: string;
  posted_at_timestamp: number;
  openai_step2_localisation: string;
  openai_step3_categorie: string;
  openai_step3_postes_selectionnes: string[];
  openai_step3_justification: string;
  unipile_company: string;
  unipile_position: string;
  unipile_company_linkedin_id: string;
  unipile_profile_scraped: boolean;
  unipile_profile_scraped_at: string;
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
  processing_status?: string;
}

export const useLeads = () => {
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
    // Extract unique categories from leads, excluding "Autre"
    const categories = [...new Set(leads.map(lead => lead.openai_step3_categorie).filter(category => category && category !== 'Autre'))];
    setAvailableCategories(categories);
    
    // If no categories are selected, select all available ones
    if (selectedCategories.length === 0 && categories.length > 0) {
      setSelectedCategories(categories);
    }
  }, [leads]);

  const fetchLeads = async () => {
    try {
      console.log('🔍 Fetching leads with company data...');
      
      // First, let's check all processing statuses to understand what we have
      const { data: statusCheck, error: statusError } = await supabase
        .from('linkedin_posts')
        .select('processing_status, openai_step3_categorie, created_at, author_name')
        .order('created_at', { ascending: false })
        .limit(50);

      if (statusError) {
        console.error('❌ Error checking statuses:', statusError);
      } else {
        console.log('📊 Recent processing statuses:', statusCheck?.reduce((acc, post) => {
          acc[post.processing_status || 'null'] = (acc[post.processing_status || 'null'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>));

        // Log posts that should appear but might be filtered
        const completedPosts = statusCheck?.filter(post => post.processing_status === 'completed');
        console.log(`✅ Found ${completedPosts?.length} completed posts`);
        
        const postsWithCategories = completedPosts?.filter(post => 
          post.openai_step3_categorie && post.openai_step3_categorie !== 'Autre'
        );
        console.log(`🏷️ Found ${postsWithCategories?.length} completed posts with valid categories`);
      }

      const { data, error } = await supabase
        .from('linkedin_posts')
        .select(`
          id,
          created_at,
          author_name,
          author_headline,
          author_profile_url,
          text,
          title,
          url,
          posted_at_iso,
          posted_at_timestamp,
          openai_step2_localisation,
          openai_step3_categorie,
          openai_step3_postes_selectionnes,
          openai_step3_justification,
          unipile_company,
          unipile_position,
          unipile_company_linkedin_id,
          unipile_profile_scraped,
          unipile_profile_scraped_at,
          unipile_response,
          phone_number,
          phone_retrieved_at,
          approach_message,
          approach_message_generated,
          approach_message_generated_at,
          is_client_lead,
          matched_client_name,
          matched_client_id,
          last_contact_at,
          linkedin_message_sent_at,
          phone_contact_status,
          phone_contact_at,
          processing_status
        `)
        .eq('processing_status', 'completed')
        .not('openai_step3_categorie', 'is', null)
        .neq('openai_step3_categorie', 'Autre')
        .order('posted_at_timestamp', { ascending: false })
        .order('posted_at_iso', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching leads:', error);
        throw error;
      }
      
      console.log(`📋 Raw query returned ${data?.length || 0} leads`);
      console.log('🔍 Sample lead data:', data?.[0] ? {
        id: data[0].id,
        processing_status: data[0].processing_status,
        openai_step3_categorie: data[0].openai_step3_categorie,
        unipile_company: data[0].unipile_company,
        unipile_position: data[0].unipile_position,
        author_name: data[0].author_name,
        created_at: data[0].created_at,
        has_unipile_response: !!data[0].unipile_response
      } : 'No data');

      // Log the categories found
      const categoriesFound = [...new Set(data?.map(lead => lead.openai_step3_categorie).filter(Boolean))];
      console.log('🏷️ Categories found in results:', categoriesFound);
      
      setLeads(data || []);
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
        return new Date(0); // Exclude any contact ever
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
        selectedCategories.includes(lead.openai_step3_categorie)
      );
      console.log(`🏷️ Category filter: ${beforeCategoryFilter} → ${filtered.length} leads (selected categories: ${selectedCategories.join(', ')})`);
    }

    // Filter by date
    const dateCutoff = getDateFilterCutoff(selectedDateFilter);
    if (dateCutoff) {
      const beforeDateFilter = filtered.length;
      filtered = filtered.filter(lead => {
        // Use posted_at_timestamp if available, otherwise fall back to posted_at_iso or created_at
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

    // Exclude leads by contact status (inverse logic)
    const contactExclusionCutoff = getContactExclusionCutoff(selectedContactFilter);
    if (contactExclusionCutoff !== null) {
      const beforeContactFilter = filtered.length;
      if (selectedContactFilter === 'exclude_all_contacted') {
        // Exclude all leads that have been contacted
        filtered = filtered.filter(lead => lead.last_contact_at === null);
      } else if (selectedContactFilter !== 'exclude_none') {
        // Exclude leads contacted within the specified timeframe
        filtered = filtered.filter(lead => {
          if (!lead.last_contact_at) return true; // Keep leads that haven't been contacted
          const contactDate = new Date(lead.last_contact_at);
          return contactDate < contactExclusionCutoff; // Keep only leads contacted before the cutoff
        });
      }
      console.log(`📞 Contact filter (${selectedContactFilter}): ${beforeContactFilter} → ${filtered.length} leads`);
    }

    // Sort filtered leads by publication date (most recent first)
    filtered.sort((a, b) => {
      const dateA = a.posted_at_timestamp || new Date(a.posted_at_iso || a.created_at).getTime();
      const dateB = b.posted_at_timestamp || new Date(b.posted_at_iso || b.created_at).getTime();
      return dateB - dateA; // Most recent first
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
