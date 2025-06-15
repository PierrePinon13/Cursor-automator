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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(['active']);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchJobOffers();
    fetchUsers();
    // autoAssign ne doit pas bloquer le rendu, on fait un fire-and-forget
    // Il sera déclenché après le 1er fetch, en tache de fond
    // eslint-disable-next-line
    // (rien ici)
  }, [pageIndex, pageSize]);

  const fetchJobOffers = async () => {
    try {
      setLoading(true);
      setHasMore(true);

      // ⚡️ Optimisation : chargement paginé
      // (pas de select count(*), head: true)
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('client_job_offers')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('❌ Error fetching job offers:', error);
        throw error;
      }

      // Si moins d'offres que pageSize -> plus de pages à charger
      if (data && data.length < pageSize) setHasMore(false);

      // maj state (page 0 = remplacement, page >0 = concaténation)
      setJobOffers(prev => pageIndex === 0 ? (data || []) : [...prev, ...(data || [])]);
      
      // ⚡️ L'auto-assign ne bloque plus le rendu : lancement en arrière-plan désormais
      if (pageIndex === 0 && data) autoAssignNewOffers(data);

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

  const autoAssignNewOffers = async (offers: ClientJobOffer[]) => {
    try {
      console.log('🤖 Starting auto-assignment for new offers...');
      
      // Récupérer toutes les offres non assignées qui ont un client associé
      const unassignedOffers = offers.filter(offer => 
        !offer.assigned_to_user_id && 
        offer.matched_client_id && 
        offer.status !== 'archivee'
      );

      if (unassignedOffers.length === 0) {
        console.log('ℹ️ No unassigned offers found for auto-assignment');
        return;
      }

      console.log(`🎯 Found ${unassignedOffers.length} unassigned offers for auto-assignment`);

      for (const offer of unassignedOffers) {
        // Récupérer les collaborateurs du client
        const { data: collaborators, error: collaboratorsError } = await supabase
          .from('client_collaborators')
          .select('user_id')
          .eq('client_id', offer.matched_client_id);

        if (collaboratorsError) {
          console.error('❌ Error fetching collaborators for client:', offer.matched_client_id, collaboratorsError);
          continue;
        }

        if (collaborators && collaborators.length > 0) {
          // Sélectionner un collaborateur (round-robin ou aléatoire)
          const randomCollaborator = collaborators[Math.floor(Math.random() * collaborators.length)];
          
          console.log(`🔄 Auto-assigning offer ${offer.id} to user ${randomCollaborator.user_id}`);
          
          // Assigner l'offre
          const { error: assignError } = await supabase
            .from('client_job_offers')
            .update({
              assigned_to_user_id: randomCollaborator.user_id,
              assigned_at: new Date().toISOString(),
              status: 'en_attente',
              updated_at: new Date().toISOString()
            })
            .eq('id', offer.id);

          if (assignError) {
            console.error('❌ Error auto-assigning offer:', assignError);
          } else {
            console.log(`✅ Successfully auto-assigned offer ${offer.id}`);
          }
        }
      }

      console.log('✅ Auto-assignment process completed');
    } catch (error) {
      console.error('❌ Error in autoAssignNewOffers:', error);
    }
  };

  const updateJobOfferOptimistically = (jobOfferId: string, updates: Partial<ClientJobOffer>) => {
    setJobOffers(prevOffers => 
      prevOffers.map(offer => 
        offer.id === jobOfferId 
          ? { ...offer, ...updates, updated_at: new Date().toISOString() }
          : offer
      )
    );
  };

  const assignUserToClient = async (userId: string, clientId: string) => {
    try {
      console.log('🔗 Assigning user to client automatically:', { userId, clientId });
      
      // Vérifier si l'utilisateur est déjà assigné à ce client
      const { data: existingCollaborator, error: checkError } = await supabase
        .from('client_collaborators')
        .select('id')
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing collaborator:', checkError);
        return;
      }

      // Si l'utilisateur n'est pas déjà collaborateur, l'ajouter
      if (!existingCollaborator) {
        const { error: insertError } = await supabase
          .from('client_collaborators')
          .insert({
            user_id: userId,
            client_id: clientId
          });

        if (insertError) {
          console.error('❌ Error adding user as client collaborator:', insertError);
        } else {
          console.log('✅ User automatically added as client collaborator');
        }
      } else {
        console.log('ℹ️ User is already a collaborator for this client');
      }
    } catch (error) {
      console.error('❌ Error in assignUserToClient:', error);
    }
  };

  const assignJobOffer = async (jobOfferId: string, userId: string | null) => {
    try {
      const jobOffer = jobOffers.find(offer => offer.id === jobOfferId);
      
      const updateData: any = {
        assigned_to_user_id: userId,
        assigned_at: userId ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (userId) {
        updateData.status = 'en_attente';
        
        // Si l'offre a un client associé, assigner automatiquement l'utilisateur à ce client
        if (jobOffer?.matched_client_id) {
          await assignUserToClient(userId, jobOffer.matched_client_id);
        }
      } else {
        updateData.status = 'non_attribuee';
      }

      // Mise à jour optimiste
      updateJobOfferOptimistically(jobOfferId, updateData);

      const { error } = await supabase
        .from('client_job_offers')
        .update(updateData)
        .eq('id', jobOfferId);

      if (error) {
        console.error('❌ Error in assignJobOffer:', error);
        // Revert optimistic update on error
        fetchJobOffers();
        throw error;
      }

      toast({
        title: "Succès",
        description: userId ? "Offre assignée avec succès." : "Assignation supprimée avec succès.",
      });
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
      console.log('🔄 Updating job offer status:', { jobOfferId, newStatus });
      
      // Mise à jour optimiste
      updateJobOfferOptimistically(jobOfferId, { status: newStatus });

      const { error } = await supabase
        .from('client_job_offers')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobOfferId);

      if (error) {
        console.error('❌ Error updating job offer status:', error);
        // Revert optimistic update on error
        fetchJobOffers();
        throw error;
      }

      console.log('✅ Job offer status updated successfully');

      const actionText = newStatus === 'archivee' ? 'archivée' : 
                        newStatus === 'non_attribuee' ? 'désarchivée' : 'mise à jour';

      toast({
        title: "Succès",
        description: `Offre ${actionText} avec succès.`,
      });
    } catch (error: any) {
      console.error('Error updating job offer status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    }
  };

  // Pagination handler à exposer
  const loadMore = () => {
    if (hasMore && !loading) setPageIndex(prev => prev + 1);
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
      if (jobOffer.status !== 'archivee') return true;
    }
    
    if (selectedStatusFilter.includes('archived')) {
      if (jobOffer.status === 'archivee') return true;
    }
    
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
    refreshJobOffers: () => { setPageIndex(0); fetchJobOffers(); },
    animatingItems,
    pageIndex,
    setPageIndex,
    hasMore,
    loadMore,
    pageSize,
    setPageSize
  };
}
