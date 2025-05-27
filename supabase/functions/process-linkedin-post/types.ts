
export interface ProcessingContext {
  postId: string;
  post: any;
  supabaseClient: any;
  openAIApiKey: string;
  unipileApiKey: string;
  isRetry: boolean;
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  postId: string;
  isJobPosting?: boolean;
  meetsLocationCriteria?: boolean;
  category?: string;
  selectedPositions?: string[];
  company?: string;
  position?: string;
  isClientLead?: boolean;
  clientName?: string;
  deduplication?: any;
  finalStatus?: string;
}
