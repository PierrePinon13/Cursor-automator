
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface AdminAction {
  action_type: 'retry_posts' | 'delete_posts' | 'investigate' | 'collect_metrics';
  action_details: any;
  posts_affected?: number;
}

export const useAdminActions = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const executeAction = async (action: AdminAction) => {
    if (!user) return;
    
    setLoading(true);
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (action.action_type) {
        case 'retry_posts':
          result = await retryPosts(action.action_details);
          break;
        case 'delete_posts':
          result = await deletePosts(action.action_details);
          break;
        case 'collect_metrics':
          result = await collectCurrentMetrics();
          break;
        default:
          throw new Error('Action type not supported');
      }

      // Log the action
      await supabase
        .from('admin_actions_log')
        .insert({
          user_id: user.id,
          action_type: action.action_type,
          action_details: action.action_details,
          posts_affected: result.postsAffected,
          execution_time_ms: Date.now() - startTime,
          success: true,
        });

      toast({
        title: "Action exécutée avec succès",
        description: `${result.postsAffected} posts traités en ${Date.now() - startTime}ms`,
      });

      return result;
    } catch (error: any) {
      // Log the failed action
      await supabase
        .from('admin_actions_log')
        .insert({
          user_id: user.id,
          action_type: action.action_type,
          action_details: action.action_details,
          posts_affected: 0,
          execution_time_ms: Date.now() - startTime,
          success: false,
          error_message: error.message,
        });

      toast({
        title: "Erreur lors de l'exécution",
        description: error.message,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const retryPosts = async (filters: any) => {
    // Retry posts en erreur via la fonction edge
    const { data, error } = await supabase.functions.invoke('retry-failed-posts', {
      body: { filters },
    });

    if (error) throw error;
    return { postsAffected: data.retried || 0 };
  };

  const deletePosts = async (filters: any) => {
    // Supprimer les posts définitivement échoués
    const { data, error } = await supabase
      .from('linkedin_posts')
      .delete()
      .eq('processing_status', 'failed_max_retries')
      .gte('retry_count', 3);

    if (error) throw error;
    return { postsAffected: data?.length || 0 };
  };

  const collectCurrentMetrics = async () => {
    // Déclencher la collecte manuelle des métriques
    const { error } = await supabase.rpc('collect_processing_metrics');
    
    if (error) throw error;
    return { postsAffected: 1 }; // 1 action de collecte
  };

  return {
    executeAction,
    loading,
  };
};
