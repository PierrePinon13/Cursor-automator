
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSavedSearches() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['saved-job-searches'],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('saved_job_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(search => ({
        id: search.id,
        name: search.name,
        jobFilters: search.job_filters,
        personaFilters: search.persona_filters,
        messageTemplate: search.message_template,
        createdAt: new Date(search.created_at),
        lastExecuted: search.last_executed_at ? new Date(search.last_executed_at) : undefined,
        resultsCount: search.results_count
      }));
    },
    enabled: !!user?.id
  });

  return {
    savedSearches: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['saved-job-searches'] }),
  };
}
