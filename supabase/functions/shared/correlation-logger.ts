
// Shared correlation logging utilities
export interface CorrelationContext {
  correlationId: string;
  postId: string;
  step: string;
  datasetId?: string;
}

export class CorrelationLogger {
  private context: CorrelationContext;

  constructor(context: CorrelationContext) {
    this.context = context;
  }

  static generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  info(message: string, data?: any) {
    console.log(`[${this.context.correlationId}] [${this.context.step}] [${this.context.postId}] ℹ️ ${message}`, data ? JSON.stringify(data) : '');
  }

  success(message: string, data?: any) {
    console.log(`[${this.context.correlationId}] [${this.context.step}] [${this.context.postId}] ✅ ${message}`, data ? JSON.stringify(data) : '');
  }

  error(message: string, error?: any) {
    console.error(`[${this.context.correlationId}] [${this.context.step}] [${this.context.postId}] ❌ ${message}`, error);
  }

  warn(message: string, data?: any) {
    console.warn(`[${this.context.correlationId}] [${this.context.step}] [${this.context.postId}] ⚠️ ${message}`, data ? JSON.stringify(data) : '');
  }

  async logStepStart(metadata?: any) {
    this.info(`Step ${this.context.step} started`, {
      dataset_id: this.context.datasetId,
      metadata
    });
  }

  async logStepEnd(result: any, duration?: number) {
    this.success(`Step ${this.context.step} completed`, {
      duration_ms: duration,
      result_summary: this.summarizeResult(result)
    });
  }

  async logStepError(error: any, duration?: number) {
    this.error(`Step ${this.context.step} failed`, {
      duration_ms: duration,
      error: error.message || error.toString()
    });
  }

  private summarizeResult(result: any): any {
    if (!result) return null;
    
    // Summarize based on result type
    if (result.recrute_poste) {
      return { recrute_poste: result.recrute_poste, postes_count: result.postes?.split(',')?.length || 0 };
    }
    if (result.reponse) {
      return { reponse: result.reponse, langue: result.langue };
    }
    if (result.categorie) {
      return { categorie: result.categorie, postes_count: result.postes_selectionnes?.length || 0 };
    }
    
    return { success: !!result.success };
  }
}

export async function updatePostWithCorrelation(
  supabaseClient: any,
  postId: string,
  correlationId: string,
  updates: any
) {
  const finalUpdates = {
    ...updates,
    correlation_id: correlationId,
    last_updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from('linkedin_posts')
    .update(finalUpdates)
    .eq('id', postId);

  if (error) {
    console.error(`[${correlationId}] Failed to update post ${postId}:`, error);
    throw error;
  }
}

export async function handleWorkerError(
  supabaseClient: any,
  postId: string,
  correlationId: string,
  step: string,
  error: any
) {
  console.error(`[${correlationId}] [${step}] [${postId}] Worker error:`, error);
  
  await updatePostWithCorrelation(supabaseClient, postId, correlationId, {
    processing_status: 'error',
    retry_count: supabaseClient.rpc('increment', { x: 1 }),
    last_retry_at: new Date().toISOString(),
    error_details: error.message || error.toString()
  });
}
