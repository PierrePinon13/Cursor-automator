
// Orchestrateur de workflow pour gérer l'enchaînement des étapes
export async function orchestrateWorkflow(supabaseClient: any, postId: string, currentStep: string, result: any, datasetId?: string) {
  console.log(`🎯 Orchestrating workflow - Post: ${postId}, Current step: ${currentStep}, Dataset: ${datasetId}`);
  
  try {
    switch (currentStep) {
      case 'step1_completed':
        if (result.recrute_poste === 'oui' || result.recrute_poste === 'yes') {
          console.log(`✅ Step 1 passed for post ${postId}, triggering Step 2`);
          await triggerOpenAIStep2(supabaseClient, postId, datasetId);
        } else {
          console.log(`❌ Step 1 failed for post ${postId}, marking as not_job_posting`);
          await markPostStatus(supabaseClient, postId, 'not_job_posting');
        }
        break;
        
      case 'step2_completed':
        if (result.reponse === 'oui' || result.reponse === 'yes') {
          console.log(`✅ Step 2 passed for post ${postId}, triggering Step 3`);
          await triggerOpenAIStep3(supabaseClient, postId, datasetId);
        } else {
          console.log(`❌ Step 2 failed for post ${postId}, marking as filtered_out`);
          await markPostStatus(supabaseClient, postId, 'filtered_out');
        }
        break;
        
      case 'step3_completed':
        console.log(`✅ Step 3 completed for post ${postId}, triggering Unipile scraping`);
        await triggerUnipileScraping(supabaseClient, postId, datasetId);
        break;
        
      case 'unipile_completed':
        console.log(`✅ Unipile scraping completed for post ${postId}, triggering company verification`);
        await triggerCompanyVerification(supabaseClient, postId, datasetId, result);
        break;
        
      case 'company_completed':
        console.log(`✅ Company verification completed for post ${postId}, triggering lead creation`);
        await triggerLeadCreation(supabaseClient, postId, datasetId);
        break;
        
      case 'lead_completed':
        console.log(`✅ Lead creation completed for post ${postId}, marking as completed`);
        await markPostStatus(supabaseClient, postId, 'completed');
        break;
        
      default:
        console.warn(`⚠️ Unknown workflow step: ${currentStep} for post ${postId}`);
    }
  } catch (error) {
    console.error(`❌ Error in workflow orchestration for post ${postId}:`, error);
    await handleWorkflowError(supabaseClient, postId, currentStep, error);
  }
}

async function triggerOpenAIStep2(supabaseClient: any, postId: string, datasetId?: string) {
  await supabaseClient.functions.invoke('openai-step2-worker', {
    body: { 
      post_id: postId,
      dataset_id: datasetId,
      workflow_trigger: true
    }
  });
}

async function triggerOpenAIStep3(supabaseClient: any, postId: string, datasetId?: string) {
  await supabaseClient.functions.invoke('openai-step3-worker', {
    body: { 
      post_id: postId,
      dataset_id: datasetId,
      workflow_trigger: true
    }
  });
}

async function triggerUnipileScraping(supabaseClient: any, postId: string, datasetId?: string) {
  await supabaseClient.functions.invoke('specialized-unipile-worker', {
    body: { 
      post_id: postId,
      dataset_id: datasetId,
      workflow_trigger: true
    }
  });
}

async function triggerCompanyVerification(supabaseClient: any, postId: string, datasetId?: string, unipileResult?: any) {
  await supabaseClient.functions.invoke('specialized-company-worker', {
    body: { 
      post_id: postId,
      dataset_id: datasetId,
      unipile_result: unipileResult,
      workflow_trigger: true
    }
  });
}

async function triggerLeadCreation(supabaseClient: any, postId: string, datasetId?: string) {
  await supabaseClient.functions.invoke('specialized-lead-worker', {
    body: { 
      post_id: postId,
      dataset_id: datasetId,
      workflow_trigger: true
    }
  });
}

async function markPostStatus(supabaseClient: any, postId: string, status: string) {
  await supabaseClient
    .from('linkedin_posts')
    .update({
      processing_status: status,
      last_updated_at: new Date().toISOString()
    })
    .eq('id', postId);
}

async function handleWorkflowError(supabaseClient: any, postId: string, step: string, error: any) {
  console.error(`❌ Workflow error at step ${step} for post ${postId}:`, error);
  
  await supabaseClient
    .from('linkedin_posts')
    .update({
      processing_status: 'error',
      retry_count: supabaseClient.rpc('increment', { x: 1 }),
      last_retry_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString()
    })
    .eq('id', postId);
}

// Fonction de validation des transitions
export async function validateTransition(supabaseClient: any, postId: string, fromStep: string, toStep: string): Promise<boolean> {
  console.log(`🔍 Validating transition for post ${postId}: ${fromStep} → ${toStep}`);
  
  const { data: post, error } = await supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('id', postId)
    .single();
    
  if (error || !post) {
    console.error(`❌ Cannot validate transition - Post not found: ${postId}`);
    return false;
  }
  
  // Validation des prérequis selon l'étape cible
  const validations = {
    'step2': () => post.openai_step1_recrute_poste === 'oui',
    'step3': () => post.openai_step2_reponse === 'oui',
    'unipile': () => post.openai_step3_categorie !== null,
    'company': () => post.unipile_profile_scraped === true,
    'lead': () => post.unipile_company_linkedin_id !== null
  };
  
  const validator = validations[toStep as keyof typeof validations];
  if (validator && !validator()) {
    console.warn(`⚠️ Transition validation failed for post ${postId}: ${fromStep} → ${toStep}`);
    return false;
  }
  
  console.log(`✅ Transition validated for post ${postId}: ${fromStep} → ${toStep}`);
  return true;
}
