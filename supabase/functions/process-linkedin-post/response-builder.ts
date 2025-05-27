
import { ProcessingResult } from './types.ts'

export function buildSuccessResponse(
  postId: string,
  step1Result: any,
  step2Result: any,
  step3Result: any,
  scrapingResult: any,
  clientMatch: any,
  deduplicationResult: any,
  finalStatus: string
): ProcessingResult {
  return {
    success: true,
    message: 'Post processed successfully',
    postId: postId,
    isJobPosting: step1Result.recrute_poste === 'oui',
    meetsLocationCriteria: step2Result.reponse === 'oui',
    category: step3Result.categorie,
    selectedPositions: step3Result.postes_selectionnes,
    company: scrapingResult.company,
    position: scrapingResult.position,
    isClientLead: clientMatch.isClientLead,
    clientName: clientMatch.clientName,
    deduplication: deduplicationResult,
    finalStatus: finalStatus
  }
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
