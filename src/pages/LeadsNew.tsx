
import { useState, useEffect } from 'react';
import { useLeadsNew } from '@/hooks/useLeadsNew';
import { useSavedViews } from '@/hooks/useSavedViews';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import DraggableTable from '@/components/leads/DraggableTable';
import CardView from '@/components/leads/CardView';
import LeadsFilters from '@/components/leads/LeadsFilters';
import SavedViewsButton from '@/components/leads/SavedViewsButton';
import { useSidebar } from '@/components/ui/sidebar';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';

const LeadsNew = () => {
  const { 
    filteredLeads, 
    loading, 
    selectedCategories, 
    setSelectedCategories,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedContactFilter,
    setSelectedContactFilter,
    availableCategories,
    refreshLeads
  } = useLeadsNew();
  
  const { getDefaultView, applyView } = useSavedViews();
  const { toggleSidebar } = useSidebar();
  
  const [visibleColumns, setVisibleColumns] = useState([
    'posted_date',
    'last_updated', 
    'job_title', 
    'author_name', 
    'company', 
    'last_contact',
    'category', 
    'location'
  ]);

  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [hasLoadedDefaultView, setHasLoadedDefaultView] = useState(false);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number | null>(null);

  // Load default view only on initial mount
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

    if (!hasLoadedDefaultView) {
      loadDefaultView();
    }
  }, [getDefaultView, applyView, setSelectedCategories, setSelectedDateFilter, setSelectedContactFilter, hasLoadedDefaultView]);

  // Listen for default view changes
  useEffect(() => {
    const handleDefaultViewChange = () => {
      const defaultView = getDefaultView();
      if (defaultView) {
        const viewConfig = applyView(defaultView);
        setSelectedCategories(viewConfig.selectedCategories);
        setVisibleColumns(viewConfig.visibleColumns);
        setSelectedDateFilter(viewConfig.selectedDateFilter);
        setSelectedContactFilter(viewConfig.selectedContactFilter);
        setViewMode(viewConfig.viewMode);
      }
    };

    window.addEventListener('defaultViewChanged', handleDefaultViewChange);
    
    return () => {
      window.removeEventListener('defaultViewChanged', handleDefaultViewChange);
    };
  }, [getDefaultView, applyView, setSelectedCategories, setSelectedDateFilter, setSelectedContactFilter]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleSidebar: toggleSidebar,
    onNextItem: () => {
      if (selectedLeadIndex !== null && selectedLeadIndex < filteredLeads.length - 1) {
        setSelectedLeadIndex(selectedLeadIndex + 1);
      } else if (filteredLeads.length > 0) {
        setSelectedLeadIndex(0);
      }
    },
    onPreviousItem: () => {
      if (selectedLeadIndex !== null && selectedLeadIndex > 0) {
        setSelectedLeadIndex(selectedLeadIndex - 1);
      } else if (filteredLeads.length > 0) {
        setSelectedLeadIndex(filteredLeads.length - 1);
      }
    },
    enabled: true
  });

  // Touch gestures
  useTouchGestures({
    onSwipeLeft: () => {
      if (selectedLeadIndex !== null && selectedLeadIndex < filteredLeads.length - 1) {
        setSelectedLeadIndex(selectedLeadIndex + 1);
      } else if (filteredLeads.length > 0) {
        setSelectedLeadIndex(0);
      }
    },
    onSwipeRight: () => {
      if (selectedLeadIndex !== null && selectedLeadIndex > 0) {
        setSelectedLeadIndex(selectedLeadIndex - 1);
      } else if (filteredLeads.length > 0) {
        setSelectedLeadIndex(filteredLeads.length - 1);
      }
    },
    enabled: true
  });

  const handleActionCompleted = () => {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header intégré avec les boutons et filtres */}
      <div className="px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center gap-3 mb-6">
          <CustomSidebarTrigger />
          <SavedViewsButton
            selectedCategories={selectedCategories}
            visibleColumns={visibleColumns}
            selectedDateFilter={selectedDateFilter}
            selectedContactFilter={selectedContactFilter}
            viewMode={viewMode}
            onApplyView={handleApplyView}
          />
        </div>
        
        <LeadsFilters
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          selectedDateFilter={selectedDateFilter}
          setSelectedDateFilter={setSelectedDateFilter}
          selectedContactFilter={selectedContactFilter}
          setSelectedContactFilter={setSelectedContactFilter}
          availableCategories={availableCategories}
          showContactFilter={true}
          showAssignmentColumn={false}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </div>
      
      {/* Tableau sans padding ni borders, fusion directe avec la page */}
      <div className="bg-white">
        {viewMode === 'table' ? (
          <DraggableTable 
            leads={filteredLeads} 
            visibleColumns={visibleColumns}
            onActionCompleted={handleActionCompleted}
            selectedLeadIndex={selectedLeadIndex}
            onLeadSelect={setSelectedLeadIndex}
          />
        ) : (
          <div className="px-6 pb-6">
            <CardView 
              leads={filteredLeads}
              onActionCompleted={handleActionCompleted}
              selectedLeadIndex={selectedLeadIndex}
              onLeadSelect={setSelectedLeadIndex}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsNew;
