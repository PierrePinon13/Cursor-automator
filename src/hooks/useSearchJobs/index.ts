
import { useSavedSearches } from './useSavedSearches';
import { useCurrentJobResults } from './useCurrentJobResults';
import { useSearchJobsCore } from './useSearchJobsCore';

// 🔗 Point d’entrée unique, API inchangée
export const useSearchJobs = () => {
  const saved = useSavedSearches();
  const results = useCurrentJobResults();
  const core = useSearchJobsCore({
    setCurrentResults: results.setCurrentResults,
    setCurrentSearchId: results.setCurrentSearchId,
    invalidateSaved: saved.invalidate,
  });

  return {
    savedSearches: saved.savedSearches,
    currentResults: results.currentResults,
    isLoading: core.isLoading || saved.isLoading,
    executeSearch: core.executeSearch,
    createSearch: core.createSearch,
    deleteSearch: core.deleteSearch,
    loadSearchResults: core.loadSearchResults,
    currentSearchId: results.currentSearchId,
    reRunSavedSearch: core.reRunSavedSearch
  }
};
