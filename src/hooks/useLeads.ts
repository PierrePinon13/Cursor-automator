
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
}

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('7days');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('all');
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
          phone_contact_at
        `)
        .eq('processing_status', 'completed')
        .not('openai_step3_categorie', 'is', null)
        .neq('openai_step3_categorie', 'Autre')
        .order('posted_at_timestamp', { ascending: false })
        .order('posted_at_iso', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
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

  const getContactFilterCutoff = (filter: string): Date | null => {
    const now = new Date();
    
    switch (filter) {
      case '7days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '2weeks':
        return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      case '1month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'contacted':
        return new Date(0); // Any contact ever
      case 'all':
      default:
        return null;
    }
  };

  const filterLeads = () => {
    let filtered = leads;

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(lead => 
        selectedCategories.includes(lead.openai_step3_categorie)
      );
    }

    // Filter by date
    const dateCutoff = getDateFilterCutoff(selectedDateFilter);
    if (dateCutoff) {
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
    }

    // Filter by contact status
    const contactCutoff = getContactFilterCutoff(selectedContactFilter);
    if (contactCutoff !== null) {
      if (selectedContactFilter === 'contacted') {
        // Show only leads that have been contacted
        filtered = filtered.filter(lead => lead.last_contact_at !== null);
      } else if (selectedContactFilter !== 'all') {
        // Show only leads contacted within the specified timeframe
        filtered = filtered.filter(lead => {
          if (!lead.last_contact_at) return false;
          const contactDate = new Date(lead.last_contact_at);
          return contactDate >= contactCutoff;
        });
      }
    }

    // Sort filtered leads by publication date (most recent first)
    filtered.sort((a, b) => {
      const dateA = a.posted_at_timestamp || new Date(a.posted_at_iso || a.created_at).getTime();
      const dateB = b.posted_at_timestamp || new Date(b.posted_at_iso || b.created_at).getTime();
      return dateB - dateA; // Most recent first
    });

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
