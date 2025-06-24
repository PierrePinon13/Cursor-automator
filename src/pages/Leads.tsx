import { useState, useEffect } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { useSavedViews } from '@/hooks/useSavedViews';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { useUserRole } from '@/hooks/useUserRole';
import { useLeadSelection } from '@/hooks/useLeadSelection';
import DraggableTable from '@/components/leads/DraggableTable';
import CardView from '@/components/leads/CardView';
import LeadsFilters from '@/components/leads/LeadsFilters';
import SavedViewsButton from '@/components/leads/SavedViewsButton';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import { useSidebar } from '@/components/ui/sidebar';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';
import type { Lead } from '@/hooks/useLeads';

const Leads = () => {
  const { 
    filteredLeads: baseFilteredLeads, 
    loading, 
    selectedCategories, 
    setSelectedCategories,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedContactFilter,
    setSelectedContactFilter,
    selectedCompanyCategories,
    setSelectedCompanyCategories,
    minEmployees,
    setMinEmployees,
    maxEmployees,
    setMaxEmployees,
    availableCategories,
    availableCompanyCategories,
    refreshLeads
  } = useLeads();
  
  const { getDefaultView, applyView } = useSavedViews();
  const { toggleSidebar } = useSidebar();
  const { isAdmin } = useUserRole();
  
  const getDefaultColumns = () => {
    const baseColumns = [
      'posted_date',
      'job_title', 
      'author_name', 
      'company', 
      'last_contact',
      'category', 
      'location'
    ];
    
    if (isAdmin) {
      baseColumns.splice(1, 0, 'last_updated');
    }
    
    return baseColumns;
  };

  const [visibleColumns, setVisibleColumns] = useState(getDefaultColumns());
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [hasLoadedDefaultView, setHasLoadedDefaultView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter leads based on search query
  const filteredLeads: Lead[] = baseFilteredLeads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    return (
      (lead.title && lead.title.toLowerCase().includes(query)) ||
      (lead.author_name && lead.author_name.toLowerCase().includes(query)) ||
      (lead.company_name && lead.company_name.toLowerCase().includes(query)) ||
      (lead.openai_step2_localisation && lead.openai_step2_localisation.toLowerCase().includes(query))
    );
  });

  // Utiliser le hook de sélection de lead
  const {
    selectedLeadIndex,
    setSelectedLeadIndex,
    navigateToNext,
    navigateToPrevious,
    closeLeadDetail
  } = useLeadSelection(filteredLeads.length);

  // Update visible columns when admin status changes
  useEffect(() => {
    if (!hasLoadedDefaultView) {
      setVisibleColumns(getDefaultColumns());
    }
  }, [isAdmin, hasLoadedDefaultView]);

  // Load default view only on initial mount, not on every change
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

    // Load only on initial mount
    if (!hasLoadedDefaultView) {
      loadDefaultView();
    }
  }, [getDefaultView, applyView, setSelectedCategories, setSelectedDateFilter, setSelectedContactFilter, hasLoadedDefaultView]);

  // Listen for default view changes (when user sets a new default view)
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
    onNextItem: navigateToNext,
    onPreviousItem: navigateToPrevious,
    enabled: true
  });

  // Touch gestures
  useTouchGestures({
    onSwipeLeft: navigateToNext,
    onSwipeRight: navigateToPrevious,
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
    <div className="min-h-screen bg-gray-50">
      {/* Header intégré avec les boutons et filtres */}
      <div className="px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
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
          <UserActionsDropdown />
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
          selectedCompanyCategories={selectedCompanyCategories}
          setSelectedCompanyCategories={setSelectedCompanyCategories}
          minEmployees={minEmployees}
          setMinEmployees={setMinEmployees}
          maxEmployees={maxEmployees}
          setMaxEmployees={setMaxEmployees}
          availableCategories={availableCategories}
          availableCompanyCategories={availableCompanyCategories}
          showContactFilter={true}
          showAssignmentColumn={false}
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isAdmin={isAdmin}
        />
      </div>
      
      {/* Tableau sans padding ni borders, fusion directe avec la page */}
      <div className="bg-white">
        {viewMode === 'table' ? (
          <DraggableTable 
            leads={filteredLeads as any} 
            visibleColumns={visibleColumns}
            onActionCompleted={handleActionCompleted}
            selectedLeadIndex={selectedLeadIndex}
            onLeadSelect={setSelectedLeadIndex}
            isAdmin={isAdmin}
          />
        ) : (
          <div className="px-6 pb-6">
            <CardView 
              leads={filteredLeads as any}
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

export default Leads;
