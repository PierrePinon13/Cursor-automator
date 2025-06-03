import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Reminder {
  id: string;
  type: string;
  target_user_id: string;
  lead_id: string;
  title: string;
  message: string;
  due_date: string | null;
  creator_user_id: string;
  created_at: string;
  updated_at: string;
  read: boolean;
  lead_data?: {
    author_name?: string;
    company_position?: string;
    company_name?: string;
    unipile_company?: string;
    unipile_position?: string;
    openai_step3_categorie?: string;
  };
  creator_name?: string;
}

interface CreateReminderParams {
  type: string;
  target_user_id: string;
  lead_id: string;
  title: string;
  message: string;
  due_date: string;
}

export const useReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchReminders = async () => {
    if (!user) return;

    try {
      const allReminders: Reminder[] = [];

      // 1. Récupérer les rappels traditionnels
      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false });

      if (remindersError) throw remindersError;

      // Récupérer les données des leads pour les rappels
      const leadIds = remindersData?.map(r => r.lead_id) || [];
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, author_name, company_position, company_name, unipile_company, unipile_position, openai_step3_categorie')
        .in('id', leadIds);

      if (leadsError) throw leadsError;

      // Récupérer les noms des créateurs
      const creatorIds = remindersData?.map(r => r.creator_user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds);

      if (profilesError) throw profilesError;

      // Transformer les rappels traditionnels
      remindersData?.forEach(reminder => {
        const leadData = leadsData?.find(lead => lead.id === reminder.lead_id);
        const creatorProfile = profilesData?.find(profile => profile.id === reminder.creator_user_id);
        
        allReminders.push({
          ...reminder,
          lead_data: leadData ? {
            author_name: leadData.author_name,
            company_position: leadData.company_position,
            company_name: leadData.company_name,
            unipile_company: leadData.unipile_company,
            unipile_position: leadData.unipile_position,
            openai_step3_categorie: leadData.openai_step3_categorie
          } : undefined,
          creator_name: creatorProfile?.full_name || 'Utilisateur inconnu'
        });
      });

      // 2. Récupérer les leads assignés récemment (dernières 48h)
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const { data: assignedLeads, error: assignedLeadsError } = await supabase
        .from('leads')
        .select('id, author_name, company_position, company_name, unipile_company, unipile_position, openai_step3_categorie, assigned_at, assigned_to_user_id')
        .eq('assigned_to_user_id', user.id)
        .gte('assigned_at', twoDaysAgo)
        .order('assigned_at', { ascending: false });

      if (assignedLeadsError) throw assignedLeadsError;

      // Transformer les assignations de leads en notifications
      assignedLeads?.forEach(lead => {
        allReminders.push({
          id: `lead_${lead.id}`,
          type: 'lead_assigned',
          target_user_id: user.id,
          lead_id: lead.id,
          title: `Nouveau lead assigné`,
          message: `Lead ${lead.author_name || 'Nom inconnu'} vous a été assigné`,
          due_date: null,
          creator_user_id: user.id, // Auto-assigné
          created_at: lead.assigned_at,
          updated_at: lead.assigned_at,
          read: false, // Toujours non lu pour les nouvelles assignations
          lead_data: {
            author_name: lead.author_name,
            company_position: lead.company_position,
            company_name: lead.company_name,
            unipile_company: lead.unipile_company,
            unipile_position: lead.unipile_position,
            openai_step3_categorie: lead.openai_step3_categorie
          },
          creator_name: 'Système'
        });
      });

      // 3. Récupérer les offres d'emploi assignées récemment (dernières 48h)
      const { data: assignedJobOffers, error: jobOffersError } = await supabase
        .from('client_job_offers')
        .select('id, title, company_name, location, assigned_at, assigned_to_user_id')
        .eq('assigned_to_user_id', user.id)
        .gte('assigned_at', twoDaysAgo)
        .order('assigned_at', { ascending: false });

      if (jobOffersError) throw jobOffersError;

      // Transformer les assignations d'offres en notifications
      assignedJobOffers?.forEach(jobOffer => {
        allReminders.push({
          id: `job_${jobOffer.id}`,
          type: 'job_offer_assigned',
          target_user_id: user.id,
          lead_id: jobOffer.id, // Utiliser l'ID de l'offre comme lead_id
          title: `Nouvelle offre d'emploi assignée`,
          message: `Offre "${jobOffer.title}" chez ${jobOffer.company_name || 'Entreprise inconnue'} vous a été assignée`,
          due_date: null,
          creator_user_id: user.id,
          created_at: jobOffer.assigned_at,
          updated_at: jobOffer.assigned_at,
          read: false,
          lead_data: {
            author_name: jobOffer.title,
            company_name: jobOffer.company_name,
            company_position: jobOffer.location
          },
          creator_name: 'Système'
        });
      });

      // Trier toutes les notifications par date de création
      allReminders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setReminders(allReminders);
      setUnreadCount(allReminders.filter(r => !r.read).length);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const createReminder = async (params: CreateReminderParams) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          type: params.type,
          target_user_id: params.target_user_id,
          lead_id: params.lead_id,
          title: params.title,
          message: params.message,
          due_date: params.due_date,
          creator_user_id: params.target_user_id
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rappel créé avec succès",
      });

      await fetchReminders();
      return data;
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le rappel",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (reminderId: string) => {
    try {
      // Si c'est une notification générée (lead ou job offer), ne pas essayer de l'update en base
      if (reminderId.startsWith('lead_') || reminderId.startsWith('job_')) {
        setReminders(prev => 
          prev.map(r => r.id === reminderId ? { ...r, read: true } : r)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return;
      }

      const { error } = await supabase
        .from('reminders')
        .update({ read: true })
        .eq('id', reminderId);

      if (error) throw error;

      setReminders(prev => 
        prev.map(r => r.id === reminderId ? { ...r, read: true } : r)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking reminder as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      // Marquer les rappels traditionnels comme lus
      const { error } = await supabase
        .from('reminders')
        .update({ read: true })
        .eq('target_user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Marquer toutes les notifications comme lues localement
      setReminders(prev => prev.map(r => ({ ...r, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all reminders as read:', error);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [user]);

  return {
    reminders,
    unreadCount,
    loading,
    createReminder,
    markAsRead,
    markAllAsRead,
    refreshReminders: fetchReminders
  };
};
