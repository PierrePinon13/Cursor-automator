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
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [selectedClientFilter, setSelectedClientFilter] = useState('all');
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState('all');
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
      
      // Vérifions les données récentes (dernières 24h)
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);
      const recentOffers = data?.filter(offer => new Date(offer.created_at) > last24Hours) || [];
      console.log(`⏰ Job offers from last 24 hours: ${recentOffers.length}`);
      
      if (recentOffers.length > 0) {
        console.log('🕐 Recent offers created_at times:', recentOffers.map(offer => ({
          id: offer.id,
          title: offer.title,
          created_at: offer.created_at,
          company_name: offer.company_name
        })));
      }

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
      const { error } = await supabase
        .from('client_job_offers')
        .update({
          assigned_to_user_id: userId,
          assigned_at: userId ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
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

  // Filtrage par date
  const filteredByDate = jobOffers.filter(jobOffer => {
    if (selectedDateFilter === 'all') return true;
    
    const jobOfferDate = new Date(jobOffer.created_at);
    const now = new Date();
    
    switch (selectedDateFilter) {
      case 'today':
        return jobOfferDate.toDateString() === now.toDateString();
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return jobOfferDate.toDateString() === yesterday.toDateString();
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
    filteredJobOffers: filteredByAssignment,
    users,
    loading,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedClientFilter,
    setSelectedClientFilter,
    selectedAssignmentFilter,
    setSelectedAssignmentFilter,
    availableClients,
    assignJobOffer,
    refreshJobOffers: fetchJobOffers
  };
}
