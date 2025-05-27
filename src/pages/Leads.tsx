
import { useState, useEffect } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { useSavedViews } from '@/hooks/useSavedViews';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import DraggableTable from '@/components/leads/DraggableTable';
import CardView from '@/components/leads/CardView';
import LeadsFilters from '@/components/leads/LeadsFilters';
import SavedViewsButton from '@/components/leads/SavedViewsButton';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';

const Leads = () => {
  const { 
    filteredLeads, 
    loading, 
    selectedCategories, 
    setSelectedCategories,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedContactFilter,
    setSelectedContactFilter,
    refreshLeads
  } = useLeads();
  
  const { getDefaultView, applyView } = useSavedViews();
  const { toggleSidebar } = useSidebar();
  
  const [visibleColumns, setVisibleColumns] = useState([
    'posted_date', 
    'job_title', 
    'author_name', 
    'company', 
    'last_contact',
    'post_url', 
    'status', 
    'category', 
    'location'
  ]);

  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [hasLoadedDefaultView, setHasLoadedDefaultView] = useState(false);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number | null>(null);

  // Load default view whenever we come to this page or when default view changes
  useEffect(() => {
    const loadDefaultView = () => {
      const defaultView = getDefaultView();
      console.log('Loading default view:', defaultView);
      
      if (defaultView) {
        const viewConfig = applyView(defaultView);
        setSelectedCategories(viewConfig.selectedCategories);
        setVisibleColumns(viewConfig.visibleColumns);
        setSelectedDateFilter(viewConfig.selectedDateFilter);
        setSelectedContactFilter(viewConfig.selectedContactFilter);
        setViewMode(viewConfig.viewMode);
      }
      setHasLoadedDefaultView(true);
    };

    // Load on mount
    loadDefaultView();

    // Listen for default view changes
    const handleDefaultViewChange = () => {
      loadDefaultView();
    };

    window.addEventListener('defaultViewChanged', handleDefaultViewChange);
    
    return () => {
      window.removeEventListener('defaultViewChanged', handleDefaultViewChange);
    };
  }, [getDefaultView, applyView, setSelectedCategories, setSelectedDateFilter, setSelectedContactFilter]);

  const handleNavigateToNextLead = () => {
    if (selectedLeadIndex !== null && selectedLeadIndex < filteredLeads.length - 1) {
      setSelectedLeadIndex(selectedLeadIndex + 1);
    } else if (filteredLeads.length > 0) {
      setSelectedLeadIndex(0);
    }
  };

  const handleNavigateToPreviousLead = () => {
    if (selectedLeadIndex !== null && selectedLeadIndex > 0) {
      setSelectedLeadIndex(selectedLeadIndex - 1);
    } else if (filteredLeads.length > 0) {
      setSelectedLeadIndex(filteredLeads.length - 1);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleSidebar: toggleSidebar,
    onNextItem: handleNavigateToNextLead,
    onPreviousItem: handleNavigateToPreviousLead,
    enabled: true
  });

  // Touch gestures
  useTouchGestures({
    onSwipeLeft: handleNavigateToNextLead,
    onSwipeRight: handleNavigateToPreviousLead,
    enabled: true
  });

  const handleActionCompleted = () => {
    // Refresh leads data when an action is completed
    refreshLeads();
  };

  const handleApplyView = (view: {
    selectedCategories: string[];
    visibleColumns: string[];
    selectedDateFilter: string;
    selectedContactFilter: string;
    viewMode: 'table' | 'card';
  }) => {
    setSelectedCategories(view.selectedCategories);
    setVisibleColumns(view.visibleColumns);
    setSelectedDateFilter(view.selectedDateFilter);
    setSelectedContactFilter(view.selectedContactFilter);
    setViewMode(view.viewMode);
  };

  if (loading || !hasLoadedDefaultView) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <SidebarTrigger />
        <SavedViewsButton
          selectedCategories={selectedCategories}
          visibleColumns={visibleColumns}
          selectedDateFilter={selectedDateFilter}
          selectedContactFilter={selectedContactFilter}
          viewMode={viewMode}
          onApplyView={handleApplyView}
        />
        <div className="text-sm text-muted-foreground ml-auto">
          <kbd className="px-2 py-1 text-xs bg-white border rounded">Espace</kbd> pour basculer la sidebar • 
          <kbd className="px-2 py-1 text-xs bg-white border rounded ml-1">←</kbd>
          <kbd className="px-2 py-1 text-xs bg-white border rounded">→</kbd> pour naviguer
        </div>
      </div>
      
      <div className="space-y-6">
        <LeadsFilters
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          visibleColumns={visibleColumns}
          onColumnsChange={setVisibleColumns}
          selectedDateFilter={selectedDateFilter}
          onDateFilterChange={setSelectedDateFilter}
          selectedContactFilter={selectedContactFilter}
          onContactFilterChange={setSelectedContactFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        
        <div className="bg-white rounded-lg shadow">
          {viewMode === 'table' ? (
            <DraggableTable 
              leads={filteredLeads} 
              visibleColumns={visibleColumns}
              onActionCompleted={handleActionCompleted}
              selectedLeadIndex={selectedLeadIndex}
              onLeadSelect={setSelectedLeadIndex}
            />
          ) : (
            <CardView 
              leads={filteredLeads}
              onActionCompleted={handleActionCompleted}
              selectedLeadIndex={selectedLeadIndex}
              onLeadSelect={setSelectedLeadIndex}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Leads;
