
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface ClientLead {
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

export const useClientLeads = () => {
  const [leads, setLeads] = useState<ClientLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<ClientLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('7days');
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<string>('all'); // 'all' ou 'my_tasks'
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchClientLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, selectedCategories, selectedDateFilter, selectedTaskFilter]);

  useEffect(() => {
    // Extract unique categories from leads, excluding "Autre"
    const categories = [...new Set(leads.map(lead => lead.openai_step3_categorie).filter(category => category && category !== 'Autre'))];
    setAvailableCategories(categories);
    
    // If no categories are selected, select all available ones
    if (selectedCategories.length === 0 && categories.length > 0) {
      setSelectedCategories(categories);
    }
  }, [leads]);

  const fetchClientLeads = async () => {
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
        .eq('is_client_lead', true)
        .not('matched_client_id', 'is', null)
        .not('openai_step3_categorie', 'is', null)
        .neq('openai_step3_categorie', 'Autre')
        .order('posted_at_timestamp', { ascending: false })
        .order('posted_at_iso', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const clientLeads = data || [];
      
      // Vérifier et créer les assignations automatiques pour les nouveaux leads
      await checkAndCreateAutoAssignments(clientLeads);
      
      setLeads(clientLeads);
    } catch (error: any) {
      console.error('Error fetching client leads:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les leads clients.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkAndCreateAutoAssignments = async (clientLeads: ClientLead[]) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Récupérer les assignations existantes
      const { data: existingAssignments } = await supabase
        .from('lead_assignments')
        .select('lead_id');

      const assignedLeadIds = existingAssignments?.map(a => a.lead_id) || [];

      // Récupérer les collaborateurs des clients
      const { data: clientCollaborators } = await supabase
        .from('client_collaborators')
        .select(`
          client_id,
          user_id,
          profiles (
            id,
            email,
            full_name
          )
        `);

      // Créer les assignations automatiques pour les leads non assignés
      const autoAssignments = [];
      
      for (const lead of clientLeads) {
        if (!assignedLeadIds.includes(lead.id) && lead.matched_client_id) {
          // Trouver les collaborateurs pour ce client
          const collaborators = clientCollaborators?.filter(cc => cc.client_id === lead.matched_client_id) || [];
          
          for (const collaborator of collaborators) {
            autoAssignments.push({
              lead_id: lead.id,
              user_id: collaborator.user_id,
              assigned_by: null, // null indique une assignation automatique
              assigned_at: new Date().toISOString()
            });
          }
        }
      }

      // Insérer les assignations automatiques
      if (autoAssignments.length > 0) {
        const { error: assignError } = await supabase
          .from('lead_assignments')
          .insert(autoAssignments);

        if (assignError) {
          console.error('Error creating auto assignments:', assignError);
        } else {
          console.log(`Créé ${autoAssignments.length} assignations automatiques`);
        }
      }
    } catch (error) {
      console.error('Error in auto assignment process:', error);
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

  const filterLeads = async () => {
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

    // Filter by task assignment (Tous vs Mes tâches)
    if (selectedTaskFilter === 'my_tasks') {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          // Récupérer les leads assignés à cet utilisateur
          const { data: myAssignments } = await supabase
            .from('lead_assignments')
            .select('lead_id')
            .eq('user_id', user.user.id);

          const myLeadIds = myAssignments?.map(a => a.lead_id) || [];
          
          // Filtrer pour ne garder que les leads assignés à cet utilisateur
          filtered = filtered.filter(lead => myLeadIds.includes(lead.id));
          
          console.log(`Filtre "Mes tâches": ${myLeadIds.length} leads assignés à l'utilisateur`);
        }
      } catch (error) {
        console.error('Error filtering my tasks:', error);
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
    selectedTaskFilter,
    setSelectedTaskFilter,
    availableCategories,
    refreshLeads: fetchClientLeads
  };
};
