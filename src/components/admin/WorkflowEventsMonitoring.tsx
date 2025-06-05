
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Clock, CheckCircle, XCircle, RotateCcw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowEvent {
  id: string;
  post_id: string;
  correlation_id: string;
  event_type: 'step_started' | 'step_completed' | 'step_failed' | 'step_retried';
  step_name: string;
  created_at: string;
  duration_ms?: number;
  error_message?: string;
  event_data?: any;
  dataset_id?: string;
  retry_count?: number;
}

interface StuckPost {
  post_id: string;
  stuck_at_step: string;
  stuck_since: string;
  correlation_id: string;
}

const WorkflowEventsMonitoring = () => {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [stuckPosts, setStuckPosts] = useState<StuckPost[]>([]);
  const [stepMetrics, setStepMetrics] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [searchPostId, setSearchPostId] = useState('');
  const { toast } = useToast();

  const loadWorkflowEvents = async (postId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('workflow_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (postId) {
        query = query.eq('post_id', postId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading workflow events:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les événements workflow",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBottlenecks = async () => {
    try {
      // Get bottlenecks via edge function for complex analysis
      const { data, error } = await supabase.functions.invoke('workflow-analytics', {
        body: { action: 'get_bottlenecks' }
      });

      if (error) throw error;
      
      setStuckPosts(data?.stuck_posts || []);
      setStepMetrics(data?.step_metrics || {});
    } catch (error) {
      console.error('Error loading bottlenecks:', error);
      // Fallback: basic stuck posts detection
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('workflow_events')
        .select('*')
        .eq('event_type', 'step_started')
        .lt('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        const stuck = data.map(event => ({
          post_id: event.post_id,
          stuck_at_step: event.step_name,
          stuck_since: event.created_at,
          correlation_id: event.correlation_id
        }));
        setStuckPosts(stuck);
      }
    }
  };

  useEffect(() => {
    loadWorkflowEvents();
    loadBottlenecks();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadWorkflowEvents();
      loadBottlenecks();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSearchPost = () => {
    if (searchPostId.trim()) {
      loadWorkflowEvents(searchPostId.trim());
    } else {
      loadWorkflowEvents();
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'step_started':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'step_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'step_failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'step_retried':
        return <RotateCcw className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case 'step_completed':
        return 'default';
      case 'step_failed':
        return 'destructive';
      case 'step_retried':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Monitoring Workflow Events</h2>
        <div className="flex gap-2">
          <Input
            placeholder="ID du post..."
            value={searchPostId}
            onChange={(e) => setSearchPostId(e.target.value)}
            className="w-64"
          />
          <Button onClick={handleSearchPost} variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stuck Posts Alert */}
      {stuckPosts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Posts Bloqués ({stuckPosts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stuckPosts.slice(0, 5).map((stuckPost) => (
                <div key={stuckPost.post_id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-mono text-sm">{stuckPost.post_id.slice(0, 8)}...</span>
                    <Badge variant="outline" className="ml-2">{stuckPost.stuck_at_step}</Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    Bloqué depuis {new Date(stuckPost.stuck_since).toLocaleString()}
                  </span>
                </div>
              ))}
              {stuckPosts.length > 5 && (
                <p className="text-sm text-gray-600">... et {stuckPosts.length - 5} autres posts bloqués</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Metrics */}
      {Object.keys(stepMetrics).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Métriques par Étape (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(stepMetrics).map(([step, metrics]: [string, any]) => (
                <div key={step} className="text-center p-3 bg-gray-50 rounded">
                  <h4 className="font-medium text-sm">{step}</h4>
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-blue-600">Démarrés: {metrics.started || 0}</div>
                    <div className="text-xs text-green-600">Terminés: {metrics.completed || 0}</div>
                    <div className="text-xs text-red-600">Échoués: {metrics.failed || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline des Événements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucun événement trouvé</div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50">
                  {getEventIcon(event.event_type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{event.post_id.slice(0, 8)}...</span>
                      <Badge variant={getEventBadgeVariant(event.event_type)}>
                        {event.step_name}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {event.event_type.replace('step_', '')}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(event.created_at).toLocaleString()}
                      {event.duration_ms && ` • ${event.duration_ms}ms`}
                      {event.retry_count && event.retry_count > 0 && ` • Retry #${event.retry_count}`}
                    </div>
                    
                    {event.error_message && (
                      <div className="text-xs text-red-600 mt-1 truncate">
                        Erreur: {event.error_message}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-400 font-mono">
                    {event.correlation_id.slice(-8)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowEventsMonitoring;
