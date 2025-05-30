
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

export function useClientLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<'all' | 'my_tasks'>('all');
  const { user } = useAuth();

  const fetchLeads = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching client leads from leads table...');
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('is_client_lead', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching client leads:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} client leads`);
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

  // Filtrage par tâches (pour l'instant basique, peut être enrichi avec les assignations)
  const filteredByTask = selectedTaskFilter === 'my_tasks'
    ? filteredByDate.filter(lead => {
        // Pour l'instant, on considère "mes tâches" comme les leads non contactés
        // Cela peut être enrichi avec un système d'assignation plus complexe
        return !lead.last_contact_at;
      })
    : filteredByDate;

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
    filteredLeads: filteredByTask,
    loading,
    selectedCategories,
    setSelectedCategories,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedTaskFilter,
    setSelectedTaskFilter,
    availableCategories,
    refreshLeads: fetchLeads
  };
}
