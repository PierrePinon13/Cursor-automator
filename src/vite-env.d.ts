/// <reference types="vite/client" />

// Augment the Window interface for custom property used in SearchJobs
interface Window {
  lovableJobResultsHack?: (results: any[]) => void;
}
