import { ProcessingResult } from './types.ts'

export function buildSuccessResponse(
  postId: string,
  step1Result: any,
  step2Result: any,
  step3Result: any,
  scrapingResult: any,
  clientMatch: any,
  deduplicationResult: any,
  finalStatus: string,
  leadResult?: any // Add lead creation result
): ProcessingResult {
  return {
    success: true,
    postId,
    finalStatus,
    processing: {
      step1: {
        recrute_poste: step1Result.recrute_poste,
        postes: step1Result.postes
      },
      step2: {
        reponse: step2Result.reponse,
        langue: step2Result.langue,
        localisation: step2Result.localisation_detectee,
        raison: step2Result.raison
      },
      step3: {
        categorie: step3Result.categorie,
        postes_selectionnes: step3Result.postes_selectionnes,
        justification: step3Result.justification
      },
      unipile: {
        success: scrapingResult.success,
        company: scrapingResult.company,
        position: scrapingResult.position,
        company_id: scrapingResult.company_id
      },
      clientMatch: {
        isClientLead: clientMatch.isClientLead,
        clientName: clientMatch.clientName
      },
      deduplication: deduplicationResult,
      leadCreation: leadResult // Add lead creation result
    }
  };
}

export function buildNotJobPostingResponse(postId: string): ProcessingResult {
  return {
    success: true,
    message: 'Post is not a job posting',
    postId: postId
  }
}

export function buildFilteredOutResponse(postId: string): ProcessingResult {
  return {
    success: true,
    message: 'Post filtered out due to language/location criteria',
    postId: postId
  }
}
