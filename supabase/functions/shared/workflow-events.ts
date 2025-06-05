
// Workflow events utility for tracking all pipeline steps
export interface WorkflowEvent {
  post_id: string;
  correlation_id: string;
  event_type: 'step_started' | 'step_completed' | 'step_failed' | 'step_retried';
  step_name: 'step1' | 'step2' | 'step3' | 'unipile_scraping' | 'company_verification' | 'lead_creation';
  duration_ms?: number;
  error_message?: string;
  event_data?: any;
  dataset_id?: string;
  user_id?: string;
  retry_count?: number;
}

export class WorkflowEventEmitter {
  private supabaseClient: any;

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  async emitEvent(event: WorkflowEvent): Promise<void> {
    try {
      const { error } = await this.supabaseClient
        .from('workflow_events')
        .insert({
          post_id: event.post_id,
          correlation_id: event.correlation_id,
          event_type: event.event_type,
          step_name: event.step_name,
          duration_ms: event.duration_ms,
          error_message: event.error_message,
          event_data: event.event_data,
          dataset_id: event.dataset_id,
          user_id: event.user_id,
          retry_count: event.retry_count || 0
        });

      if (error) {
        console.error(`Failed to emit workflow event:`, error);
      }
    } catch (error) {
      console.error(`Error emitting workflow event:`, error);
    }
  }

  async emitStepStarted(
    postId: string, 
    correlationId: string, 
    stepName: WorkflowEvent['step_name'], 
    metadata?: any
  ): Promise<void> {
    await this.emitEvent({
      post_id: postId,
      correlation_id: correlationId,
      event_type: 'step_started',
      step_name: stepName,
      event_data: metadata
    });
  }

  async emitStepCompleted(
    postId: string, 
    correlationId: string, 
    stepName: WorkflowEvent['step_name'], 
    durationMs: number, 
    result?: any
  ): Promise<void> {
    await this.emitEvent({
      post_id: postId,
      correlation_id: correlationId,
      event_type: 'step_completed',
      step_name: stepName,
      duration_ms: durationMs,
      event_data: result
    });
  }

  async emitStepFailed(
    postId: string, 
    correlationId: string, 
    stepName: WorkflowEvent['step_name'], 
    durationMs: number, 
    error: any
  ): Promise<void> {
    await this.emitEvent({
      post_id: postId,
      correlation_id: correlationId,
      event_type: 'step_failed',
      step_name: stepName,
      duration_ms: durationMs,
      error_message: error.message || error.toString(),
      event_data: { error: error.toString() }
    });
  }

  async emitStepRetried(
    postId: string, 
    correlationId: string, 
    stepName: WorkflowEvent['step_name'], 
    retryCount: number, 
    error: any
  ): Promise<void> {
    await this.emitEvent({
      post_id: postId,
      correlation_id: correlationId,
      event_type: 'step_retried',
      step_name: stepName,
      retry_count: retryCount,
      error_message: error.message || error.toString(),
      event_data: { error: error.toString(), retry_count: retryCount }
    });
  }
}

// Helper function to get workflow events for a post
export async function getPostWorkflowEvents(supabaseClient: any, postId: string) {
  const { data, error } = await supabaseClient
    .from('workflow_events')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching workflow events:', error);
    return [];
  }

  return data || [];
}

// Helper function to get current pipeline bottlenecks
export async function getPipelineBottlenecks(supabaseClient: any, datasetId?: string) {
  let query = supabaseClient
    .from('workflow_events')
    .select('step_name, event_type, created_at, post_id')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

  if (datasetId) {
    query = query.eq('dataset_id', datasetId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pipeline bottlenecks:', error);
    return { stuck_posts: [], step_metrics: {} };
  }

  // Analyze stuck posts (started but not completed in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const stuckPosts = [];
  const stepMetrics: any = {};

  // Group events by post
  const postEvents: any = {};
  data?.forEach((event: any) => {
    if (!postEvents[event.post_id]) {
      postEvents[event.post_id] = [];
    }
    postEvents[event.post_id].push(event);
  });

  // Find stuck posts
  Object.entries(postEvents).forEach(([postId, events]: [string, any]) => {
    const sortedEvents = events.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    
    if (lastEvent.event_type === 'step_started' && new Date(lastEvent.created_at) < oneHourAgo) {
      stuckPosts.push({
        post_id: postId,
        stuck_at_step: lastEvent.step_name,
        stuck_since: lastEvent.created_at,
        correlation_id: lastEvent.correlation_id
      });
    }

    // Calculate step metrics
    sortedEvents.forEach((event: any) => {
      if (!stepMetrics[event.step_name]) {
        stepMetrics[event.step_name] = { started: 0, completed: 0, failed: 0, avg_duration: 0 };
      }
      stepMetrics[event.step_name][event.event_type.replace('step_', '')]++;
    });
  });

  return { stuck_posts: stuckPosts, step_metrics: stepMetrics };
}
