
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface ClientJobOffer {
  id: string;
  title: string;
  company_name: string | null;
  url: string;
  location: string | null;
  job_type: string | null;
  salary: string | null;
  description: string | null;
  posted_at: string | null;
  matched_client_id: string | null;
  matched_client_name: string | null;
  assigned_to_user_id: string | null;
  assigned_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  raw_data: any;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export function useClientJobOffers() {
  const [jobOffers, setJobOffers] = useState<ClientJobOffer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateFilter, setSelectedDateFilter] = useState('last_48_hours');
  const [selectedClientFilter, setSelectedClientFilter] = useState('all');
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState('unassigned');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(['active']); // Maintenant un tableau
  const { toast } = useToast();

  useEffect(() => {
    fetchJobOffers();
    fetchUsers();
  }, []);

  const fetchJobOffers = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching client job offers...');
      
      // D'abord, comptons le total dans la table
      const { count, error: countError } = await supabase
        .from('client_job_offers')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ Error counting job offers:', countError);
      } else {
        console.log(`🔢 Total job offers in database: ${count}`);
      }

      // Maintenant récupérons les données
      const { data, error } = await supabase
        .from('client_job_offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching job offers:', error);
        throw error;
      }

      console.log(`✅ Successfully fetched ${data?.length || 0} job offers from query`);
      console.log('📊 Sample data:', data?.slice(0, 2));
      
      // Vérifions les données récentes (dernières 48h)
      const last48Hours = new Date();
      last48Hours.setHours(last48Hours.getHours() - 48);
      const recentOffers = data?.filter(offer => new Date(offer.created_at) > last48Hours) || [];
      console.log(`⏰ Job offers from last 48 hours: ${recentOffers.length}`);

      setJobOffers(data || []);
    } catch (error) {
      console.error('❌ Error in fetchJobOffers:', error);
      setJobOffers([]);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les offres d'emploi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const assignJobOffer = async (jobOfferId: string, userId: string | null) => {
    try {
      const updateData: any = {
        assigned_to_user_id: userId,
        assigned_at: userId ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      // Si on assigne à quelqu'un, changer le statut à "en_attente"
      if (userId) {
        updateData.status = 'en_attente';
      } else {
        updateData.status = 'non_attribuee';
      }

      const { error } = await supabase
        .from('client_job_offers')
        .update(updateData)
        .eq('id', jobOfferId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: userId ? "Offre assignée avec succès." : "Assignation supprimée avec succès.",
      });

      await fetchJobOffers();
    } catch (error: any) {
      console.error('Error assigning job offer:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'assignation.",
        variant: "destructive",
      });
    }
  };

  const updateJobOfferStatus = async (jobOfferId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('client_job_offers')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobOfferId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Statut mis à jour avec succès.",
      });

      await fetchJobOffers();
    } catch (error: any) {
      console.error('Error updating job offer status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    }
  };

  // Filtrage par date
  const filteredByDate = jobOffers.filter(jobOffer => {
    if (selectedDateFilter === 'all') return true;
    
    const jobOfferDate = new Date(jobOffer.posted_at || jobOffer.created_at);
    const now = new Date();
    
    switch (selectedDateFilter) {
      case 'today':
        return jobOfferDate.toDateString() === now.toDateString();
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return jobOfferDate.toDateString() === yesterday.toDateString();
      case 'last_48_hours':
        const fortyEightHoursAgo = new Date(now);
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
        return jobOfferDate >= fortyEightHoursAgo;
      case 'last_7_days':
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return jobOfferDate >= sevenDaysAgo;
      case 'last_30_days':
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return jobOfferDate >= thirtyDaysAgo;
      default:
        return true;
    }
  });

  // Filtrage par client
  const filteredByClient = selectedClientFilter === 'all' 
    ? filteredByDate 
    : filteredByDate.filter(jobOffer => 
        jobOffer.matched_client_id === selectedClientFilter
      );

  // Filtrage par assignation
  const filteredByAssignment = filteredByClient.filter(jobOffer => {
    switch (selectedAssignmentFilter) {
      case 'assigned':
        return jobOffer.assigned_to_user_id !== null;
      case 'unassigned':
        return jobOffer.assigned_to_user_id === null;
      default:
        return true;
    }
  });

  // Filtrage par statut (maintenant multi-select)
  const filteredByStatus = filteredByAssignment.filter(jobOffer => {
    if (selectedStatusFilter.includes('all')) return true;
    
    if (selectedStatusFilter.includes('active')) {
      // Si "active" est sélectionné, inclure tous les statuts non archivés
      if (jobOffer.status !== 'archivee') return true;
    }
    
    if (selectedStatusFilter.includes('archived')) {
      // Si "archived" est sélectionné, inclure les archivés
      if (jobOffer.status === 'archivee') return true;
    }
    
    // Vérifier si le statut exact est dans la sélection
    return selectedStatusFilter.includes(jobOffer.status);
  });

  // Clients disponibles pour le filtre
  const availableClients = Array.from(
    new Map(
      jobOffers
        .filter(jobOffer => jobOffer.matched_client_id && jobOffer.matched_client_name)
        .map(jobOffer => [jobOffer.matched_client_id, jobOffer.matched_client_name])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  return {
    jobOffers,
    filteredJobOffers: filteredByStatus,
    users,
    loading,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedClientFilter,
    setSelectedClientFilter,
    selectedAssignmentFilter,
    setSelectedAssignmentFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    availableClients,
    assignJobOffer,
    updateJobOfferStatus,
    refreshJobOffers: fetchJobOffers
  };
}
