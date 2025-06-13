import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  type: 'reminder' | 'lead_assignment' | 'job_offer_assignment';
  title: string;
  description: string;
  dueDate: string | null;
  isOverdue: boolean;
  isCompleted: boolean;
  priority: 'high' | 'medium' | 'low';
  data: any;
  createdAt: string;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTasks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const now = new Date();
      const tasks: Task[] = [];

      // 1. Récupérer les rappels (tous, y compris lus)
      const { data: reminders, error: remindersError } = await supabase
        .from('reminders')
        .select(`
          *,
          leads!inner(id, author_name, company_name, openai_step3_categorie)
        `)
        .eq('target_user_id', user.id)
        .order('due_date', { ascending: true });

      if (remindersError) throw remindersError;

      // Transformer les rappels en tâches
      reminders?.forEach(reminder => {
        const dueDate = reminder.due_date ? new Date(reminder.due_date) : null;
        const isOverdue = dueDate ? dueDate < now : false;
        
        tasks.push({
          id: reminder.id,
          type: 'reminder',
          title: reminder.title,
          description: reminder.message,
          dueDate: reminder.due_date,
          isOverdue: isOverdue && !reminder.read,
          isCompleted: reminder.read,
          priority: isOverdue ? 'high' : 'medium',
          data: {
            ...reminder,
            lead: reminder.leads
          },
          createdAt: reminder.created_at
        });
      });

      // 2. Récupérer les leads assignés (tous, y compris terminés)
      const { data: assignedLeads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to_user_id', user.id)
        .order('assigned_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Transformer les leads assignés en tâches
      assignedLeads?.forEach(lead => {
        const assignedDate = lead.assigned_at ? new Date(lead.assigned_at) : new Date();
        const isCompleted = !!lead.assignment_completed_at;
        const isOverdue = !isCompleted && (now.getTime() - assignedDate.getTime()) > (7 * 24 * 60 * 60 * 1000);
        
        tasks.push({
          id: lead.id,
          type: 'lead_assignment',
          title: `Lead assigné: ${lead.author_name || 'Nom inconnu'}`,
          description: `${lead.company_name || 'Entreprise inconnue'} - ${lead.openai_step3_categorie || 'Catégorie non définie'}`,
          dueDate: null,
          isOverdue,
          isCompleted,
          priority: isOverdue ? 'high' : 'medium',
          data: lead,
          createdAt: lead.assigned_at || lead.created_at
        });
      });

      // 3. Récupérer les offres d'emploi assignées (toutes, y compris terminées)
      const { data: assignedJobOffers, error: jobOffersError } = await supabase
        .from('client_job_offers')
        .select('*')
        .eq('assigned_to_user_id', user.id)
        .order('assigned_at', { ascending: false });

      if (jobOffersError) throw jobOffersError;

      // Transformer les offres d'emploi assignées en tâches
      assignedJobOffers?.forEach(jobOffer => {
        const assignedDate = jobOffer.assigned_at ? new Date(jobOffer.assigned_at) : new Date();
        const isCompleted = !!jobOffer.assignment_completed_at;
        const isOverdue = !isCompleted && (now.getTime() - assignedDate.getTime()) > (7 * 24 * 60 * 60 * 1000);
        
        tasks.push({
          id: jobOffer.id,
          type: 'job_offer_assignment',
          title: `Offre d'emploi assignée: ${jobOffer.title}`,
          description: `${jobOffer.company_name || 'Entreprise inconnue'} - ${jobOffer.location || 'Localisation non définie'}`,
          dueDate: null,
          isOverdue,
          isCompleted,
          priority: isOverdue ? 'high' : 'medium',
          data: jobOffer,
          createdAt: jobOffer.assigned_at || jobOffer.created_at
        });
      });

      // Trier les tâches
      tasks.sort((a, b) => {
        // Priorité aux tâches en retard
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        
        // Ensuite par date d'échéance
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        
        // Enfin par date de création
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setTasks(tasks);
      setPendingCount(tasks.filter(task => !task.isCompleted).length);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les tâches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addUserToClient = async (userId: string, clientId: string) => {
    try {
      console.log('🔗 Adding user to client automatically:', { userId, clientId });
      
      // Vérifier si l'utilisateur est déjà collaborateur
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

      // Si pas déjà collaborateur, l'ajouter
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
          toast({
            title: "Succès",
            description: "Vous avez été automatiquement ajouté comme collaborateur de ce client",
          });
        }
      }
    } catch (error) {
      console.error('❌ Error in addUserToClient:', error);
    }
  };

  const completeTask = async (taskId: string, taskType: Task['type']) => {
    try {
      if (taskType === 'reminder') {
        const { error } = await supabase
          .from('reminders')
          .update({ read: true })
          .eq('id', taskId);
        if (error) throw error;
      } else if (taskType === 'lead_assignment') {
        const task = tasks.find(t => t.id === taskId);
        
        // Auto-rattachement si c'est un lead client
        if (task?.data.matched_client_id && user) {
          await addUserToClient(user.id, task.data.matched_client_id);
        }
        
        const { error } = await supabase
          .from('leads')
          .update({ assignment_completed_at: new Date().toISOString() })
          .eq('id', taskId);
        if (error) throw error;
      } else if (taskType === 'job_offer_assignment') {
        const task = tasks.find(t => t.id === taskId);
        
        // Auto-rattachement si c'est une offre d'emploi client
        if (task?.data.matched_client_id && user) {
          await addUserToClient(user.id, task.data.matched_client_id);
        }
        
        const { error } = await supabase
          .from('client_job_offers')
          .update({ assignment_completed_at: new Date().toISOString() })
          .eq('id', taskId);
        if (error) throw error;
      }

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, isCompleted: true } : task
      ));
      setPendingCount(prev => Math.max(0, prev - 1));

      toast({
        title: "Succès",
        description: "Tâche marquée comme terminée",
      });
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer la tâche comme terminée",
        variant: "destructive",
      });
    }
  };

  const updateTaskStatus = async (taskId: string, taskType: Task['type'], status: string) => {
    try {
      if (taskType === 'job_offer_assignment') {
        const { error } = await supabase
          .from('client_job_offers')
          .update({ status })
          .eq('id', taskId);
        if (error) throw error;
      } else if (taskType === 'lead_assignment') {
        const { error } = await supabase
          .from('leads')
          .update({ phone_contact_status: status })
          .eq('id', taskId);
        if (error) throw error;
      }

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { 
          ...task, 
          data: { 
            ...task.data, 
            status: taskType === 'job_offer_assignment' ? status : task.data.status,
            phone_contact_status: taskType === 'lead_assignment' ? status : task.data.phone_contact_status
          } 
        } : task
      ));

      toast({
        title: "Succès",
        description: "Statut mis à jour",
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const updateTaskComment = async (taskId: string, taskType: Task['type'], comment: string) => {
    try {
      const updateData = {
        task_comment: comment,
        task_comment_updated_at: new Date().toISOString()
      };

      if (taskType === 'job_offer_assignment') {
        const { error } = await supabase
          .from('client_job_offers')
          .update(updateData)
          .eq('id', taskId);
        if (error) throw error;
      } else if (taskType === 'lead_assignment') {
        const { error } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', taskId);
        if (error) throw error;
      }

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { 
          ...task, 
          data: { 
            ...task.data, 
            task_comment: comment,
            task_comment_updated_at: updateData.task_comment_updated_at
          } 
        } : task
      ));

      toast({
        title: "Succès",
        description: "Commentaire mis à jour",
      });
    } catch (error) {
      console.error('Error updating task comment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le commentaire",
        variant: "destructive",
      });
    }
  };

  const updateTaskFollowUpDate = async (taskId: string, taskType: Task['type'], date: Date | null) => {
    try {
      const updateData = {
        follow_up_date: date ? date.toISOString() : null
      };

      if (taskType === 'job_offer_assignment') {
        const { error } = await supabase
          .from('client_job_offers')
          .update(updateData)
          .eq('id', taskId);
        if (error) throw error;
      } else if (taskType === 'lead_assignment') {
        const { error } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', taskId);
        if (error) throw error;
      }

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { 
          ...task, 
          data: { 
            ...task.data, 
            follow_up_date: updateData.follow_up_date
          } 
        } : task
      ));

      toast({
        title: "Succès",
        description: "Date de relance mise à jour",
      });
    } catch (error) {
      console.error('Error updating follow-up date:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la date de relance",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  return {
    tasks,
    loading,
    pendingCount,
    completeTask,
    updateTaskStatus,
    updateTaskComment,
    updateTaskFollowUpDate,
    refreshTasks: fetchTasks
  };
};
