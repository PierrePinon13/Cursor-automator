
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
      console.log('🔍 Fetching leads...');
      
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('❌ Error fetching leads:', leadsError);
        throw leadsError;
      }
      
      console.log(`📋 Fetched ${leadsData?.length || 0} leads`);
      setLeads(leadsData || []);
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
