import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

export interface Lead {
  id: string;
  author_name: string | null;
  author_headline: string | null;
  author_profile_url: string | null;
  company_name: string | null;
  company_position: string | null;
  phone_number: string | null;
  openai_step3_categorie: string | null;
  openai_step3_postes_selectionnes: string[] | null;
  openai_step2_localisation: string | null;
  latest_post_date: string | null;
  latest_post_url: string | null;
  latest_post_urn: string | null;
  last_contact_at: string | null;
  linkedin_message_sent_at: string | null;
  phone_contact_at: string | null;
  phone_contact_status: string | null;
  phone_contact_by_user_name: string | null;
  approach_message: string | null;
  is_client_lead: boolean | null;
  matched_client_name: string | null;
  matched_client_id: string | null;
  created_at: string;
  updated_at: string;
  url: string | null;
  title: string | null;
  text: string | null;
  processing_status: string | null;
  assigned_user?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState('7days');
  const [selectedContactFilter, setSelectedContactFilter] = useState('exclude_2weeks');
  const [visibleColumns, setVisibleColumns] = useState([
    'posted_date', 'job_title', 'author_name', 'company', 'last_contact', 'category'
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const fetchLeads = async () => {
    if (!user) return;

    setLoading(true);
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

      // Requête principale pour les leads
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtrer automatiquement la catégorie "Autre" pour les non-admins
      if (!isAdmin) {
        query = query.neq('openai_step3_categorie', 'Autre');
      }

      // Exclure les publications mal ciblées
      if (mistargetedLeadIds.length > 0) {
        query = query.not('id', 'in', `(${mistargetedLeadIds.join(',')})`);
      }

      const { data: leadsData, error } = await query;

      if (error) {
        console.error('❌ Error fetching leads:', error);
        throw error;
      }

      console.log(`✅ Fetched ${leadsData?.length || 0} leads`);
      
      // Filtrer les leads des prestataires RH
      const filteredLeads = (leadsData || []).filter(lead => {
        if (!lead.unipile_company) return true;
        return !hrProviderNames.includes(lead.unipile_company.toLowerCase());
      });

      console.log(`🔍 After filtering HR providers: ${filteredLeads.length} leads`);

      const transformedLeads = filteredLeads.map(lead => ({
        ...lead,
        assigned_user: null // Temporairement null, on peut récupérer ça séparément si besoin
      }));

      setLeads(transformedLeads);
    } catch (error) {
      console.error('❌ Error in fetchLeads:', error);
      setLeads([]);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les leads.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [user, isAdmin]);

  // Filtrage par date
  const filteredByDate = leads.filter(lead => {
    if (selectedDateFilter === 'all') return true;
    
    const leadDate = new Date(lead.created_at);
    const now = new Date();
    
    switch (selectedDateFilter) {
      case '24h':
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return leadDate >= yesterday;
      case '48h':
        const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        return leadDate >= twoDaysAgo;
      case '7days':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return leadDate >= sevenDaysAgo;
      default:
        return true;
    }
  });

  // Filtrage par statut de contact
  const filteredByContact = filteredByDate.filter(lead => {
    if (selectedContactFilter === 'exclude_none') return true;
    
    const lastContactDate = lead.last_contact_at ? new Date(lead.last_contact_at) : null;
    if (!lastContactDate) return true;
    
    const now = new Date();
    const diffInMs = now.getTime() - lastContactDate.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
    switch (selectedContactFilter) {
      case 'exclude_1week':
        return diffInDays > 7;
      case 'exclude_2weeks':
        return diffInDays > 14;
      case 'exclude_1month':
        return diffInDays > 30;
      case 'exclude_all_contacted':
        return false;
      default:
        return true;
    }
  });

  // Filtrage par catégories
  const filteredByCategory = selectedCategories.length === 0 
    ? filteredByContact 
    : filteredByContact.filter(lead => 
        lead.openai_step3_categorie && selectedCategories.includes(lead.openai_step3_categorie)
      );

  // Recherche
  const filteredBySearch = searchQuery
    ? filteredByCategory.filter(lead =>
        lead.author_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.openai_step3_categorie?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.openai_step3_postes_selectionnes?.some(poste =>
          poste.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : filteredByCategory;

  // Catégories disponibles
  const availableCategories = useMemo(() => {
    const categories = Array.from(new Set(
      leads
        .map(lead => lead.openai_step3_categorie)
        .filter(Boolean)
    )) as string[];
    
    return isAdmin ? categories : categories.filter(cat => cat !== 'Autre');
  }, [leads, isAdmin]);

  // Mettre à jour le statut du contact téléphonique
  const updatePhoneContactStatus = async (leadId: string, status: string, userId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          phone_contact_status: status,
          phone_contact_at: new Date().toISOString(),
          phone_contact_by_user_id: userId,
          phone_contact_by_user_name: userName,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      await fetchLeads();
      toast({
        title: "Succès",
        description: "Statut du contact téléphonique mis à jour.",
      });
    } catch (error: any) {
      console.error('Error updating phone contact status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut du contact téléphonique.",
        variant: "destructive",
      });
    }
  };

  return {
    leads,
    filteredLeads: filteredBySearch,
    loading,
    selectedCategories,
    setSelectedCategories,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedContactFilter,
    setSelectedContactFilter,
    visibleColumns,
    setVisibleColumns,
    searchQuery,
    setSearchQuery,
    availableCategories,
    updatePhoneContactStatus,
    refreshLeads: fetchLeads
  };
};
