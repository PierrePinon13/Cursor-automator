
// Utility to manage URL state for preserving sub-pages
export const updateUrlWithSubPage = (basePath: string, subPage: string) => {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', subPage);
  window.history.replaceState({}, '', url.toString());
};

export const getSubPageFromUrl = (defaultSubPage: string): string => {
  const url = new URL(window.location.href);
  return url.searchParams.get('tab') || defaultSubPage;
};

export const navigateToSubPage = (basePath: string, subPage: string) => {
  const url = new URL(window.location.href);
  url.pathname = basePath;
  url.searchParams.set('tab', subPage);
  window.history.pushState({}, '', url.toString());
};

// Hook pour gérer l'état des onglets avec persistance URL
export const useTabState = (defaultTab: string, basePath?: string) => {
  const [activeTab, setActiveTab] = React.useState(() => getSubPageFromUrl(defaultTab));

  const handleTabChange = React.useCallback((value: string) => {
    setActiveTab(value);
    if (basePath) {
      updateUrlWithSubPage(basePath, value);
    }
  }, [basePath]);

  // Synchroniser avec l'URL au montage et lors des changements d'onglet navigateur
  React.useEffect(() => {
    const handlePopState = () => {
      const tabFromUrl = getSubPageFromUrl(defaultTab);
      setActiveTab(tabFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    
    // Mettre à jour l'URL initiale
    if (basePath) {
      updateUrlWithSubPage(basePath, activeTab);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [defaultTab, basePath, activeTab]);

  return [activeTab, handleTabChange] as const;
};

// Ajout de React import pour le hook
import * as React from 'react';
