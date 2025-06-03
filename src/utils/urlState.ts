
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
