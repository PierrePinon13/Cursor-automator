
export function extractLinkedInPublicIdentifier(url: string): string | null {
  if (!url) return null;
  
  try {
    // Nettoyer l'URL et extraire le public identifier
    const cleanUrl = url.trim().toLowerCase();
    
    // Patterns possibles pour les URLs LinkedIn d'entreprise
    const patterns = [
      /linkedin\.com\/company\/([^\/\?]+)/,
      /linkedin\.com\/company\/([^\/\?]+)\//,
      /linkedin\.com\/showcase\/([^\/\?]+)/,  // Support pour les pages showcase
      /linkedin\.com\/showcase\/([^\/\?]+)\//,
    ];
    
    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting LinkedIn public identifier:', error);
    return null;
  }
}

export function buildLinkedInCompanyUrl(publicIdentifier: string): string {
  return `https://www.linkedin.com/company/${publicIdentifier}`;
}

export function isShowcaseUrl(url: string): boolean {
  return url.toLowerCase().includes('/showcase/');
}
