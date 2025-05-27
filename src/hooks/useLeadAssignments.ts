
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface LeadAssignment {
  id: string;
  lead_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export function useLeadAssignments() {
  const [assignments, setAssignments] = useState<LeadAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
    fetchUsers();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_assignments')
        .select('*')
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error: any) {
      console.error('Error fetching lead assignments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les assignations.",
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

  const assignLeadToUser = async (leadId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('lead_assignments')
        .insert([{
          lead_id: leadId,
          user_id: userId,
          assigned_by: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Lead assigné avec succès.",
      });

      await fetchAssignments();
    } catch (error: any) {
      console.error('Error assigning lead:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner le lead.",
        variant: "destructive",
      });
    }
  };

  const unassignLeadFromUser = async (leadId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('lead_assignments')
        .delete()
        .eq('lead_id', leadId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Assignation supprimée avec succès.",
      });

      await fetchAssignments();
    } catch (error: any) {
      console.error('Error unassigning lead:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'assignation.",
        variant: "destructive",
      });
    }
  };

  const getAssignedUsers = (leadId: string): User[] => {
    const leadAssignments = assignments.filter(a => a.lead_id === leadId);
    return users.filter(user => 
      leadAssignments.some(assignment => assignment.user_id === user.id)
    );
  };

  return {
    assignments,
    users,
    loading,
    assignLeadToUser,
    unassignLeadFromUser,
    getAssignedUsers,
    refreshAssignments: fetchAssignments,
  };
}
