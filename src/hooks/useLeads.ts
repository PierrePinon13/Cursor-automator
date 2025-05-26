
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
  unipile_profile_scraped: boolean;
  unipile_profile_scraped_at: string;
}

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('7days');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, selectedCategories, selectedDateFilter]);

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
          unipile_profile_scraped,
          unipile_profile_scraped_at
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
    availableCategories
  };
};
