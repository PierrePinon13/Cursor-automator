
import { useState, useEffect } from 'react';

export interface SavedView {
  id: string;
  name: string;
  selectedCategories: string[];
  visibleColumns: string[];
  selectedDateFilter: string;
  selectedContactFilter: string;
  viewMode: 'table' | 'card';
  createdAt: string;
  isDefault?: boolean;
}

export const useSavedViews = () => {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  useEffect(() => {
    loadSavedViews();
  }, []);

  const loadSavedViews = () => {
    const stored = localStorage.getItem('leads-saved-views');
    if (stored) {
      try {
        setSavedViews(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading saved views:', error);
      }
    }
  };

  const saveView = (
    name: string,
    selectedCategories: string[],
    visibleColumns: string[],
    selectedDateFilter: string,
    selectedContactFilter: string,
    viewMode: 'table' | 'card'
  ) => {
    const newView: SavedView = {
      id: Date.now().toString(),
      name,
      selectedCategories,
      visibleColumns,
      selectedDateFilter,
      selectedContactFilter,
      viewMode,
      createdAt: new Date().toISOString(),
    };

    const updatedViews = [...savedViews, newView];
    setSavedViews(updatedViews);
    localStorage.setItem('leads-saved-views', JSON.stringify(updatedViews));
  };

  const deleteView = (id: string) => {
    const updatedViews = savedViews.filter(view => view.id !== id);
    setSavedViews(updatedViews);
    localStorage.setItem('leads-saved-views', JSON.stringify(updatedViews));
  };

  const setDefaultView = (id: string) => {
    const updatedViews = savedViews.map(view => ({
      ...view,
      isDefault: view.id === id
    }));
    setSavedViews(updatedViews);
    localStorage.setItem('leads-saved-views', JSON.stringify(updatedViews));
  };

  const getDefaultView = (): SavedView | null => {
    return savedViews.find(view => view.isDefault) || null;
  };

  const applyView = (view: SavedView) => {
    return {
      selectedCategories: view.selectedCategories,
      visibleColumns: view.visibleColumns,
      selectedDateFilter: view.selectedDateFilter,
      selectedContactFilter: view.selectedContactFilter,
      viewMode: view.viewMode,
    };
  };

  return {
    savedViews,
    saveView,
    deleteView,
    setDefaultView,
    getDefaultView,
    applyView,
  };
};
