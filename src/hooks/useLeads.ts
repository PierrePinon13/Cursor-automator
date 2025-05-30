
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [selectedContactFilter, setSelectedContactFilter] = useState('all');

  const fetchLeads = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching leads from leads table...');
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching leads:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} leads`);
      setLeads(data || []);
    } catch (error) {
      console.error('❌ Error in fetchLeads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Filtrage par catégories
  const filteredByCategory = selectedCategories.length > 0 
    ? leads.filter(lead => 
        lead.openai_step3_categorie && 
        selectedCategories.includes(lead.openai_step3_categorie)
      )
    : leads;

  // Filtrage par date
  const filteredByDate = filteredByCategory.filter(lead => {
    if (selectedDateFilter === 'all') return true;
    
    const leadDate = new Date(lead.created_at);
    const now = new Date();
    
    switch (selectedDateFilter) {
      case 'today':
        return leadDate.toDateString() === now.toDateString();
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return leadDate.toDateString() === yesterday.toDateString();
      case 'last_7_days':
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return leadDate >= sevenDaysAgo;
      case 'last_30_days':
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return leadDate >= thirtyDaysAgo;
      default:
        return true;
    }
  });

  // Filtrage par statut de contact
  const filteredByContact = filteredByDate.filter(lead => {
    switch (selectedContactFilter) {
      case 'contacted':
        return lead.last_contact_at !== null;
      case 'not_contacted':
        return lead.last_contact_at === null;
      case 'linkedin_sent':
        return lead.linkedin_message_sent_at !== null;
      case 'phone_contacted':
        return lead.phone_contact_at !== null;
      default:
        return true;
    }
  });

  // Catégories disponibles
  const availableCategories = Array.from(
    new Set(
      leads
        .map(lead => lead.openai_step3_categorie)
        .filter(Boolean)
    )
  ).sort();

  return {
    leads,
    filteredLeads: filteredByContact,
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
}
