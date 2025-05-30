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
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

interface LinkedInPost {
  id: string;
  text: string;
  title?: string;
  url: string;
  posted_at_iso?: string;
  posted_at_timestamp?: number;
  openai_step2_localisation?: string;
  openai_step3_categorie?: string;
  openai_step3_postes_selectionnes?: string[];
  openai_step3_justification?: string;
  created_at: string;
}

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

  // Convert leads to the format expected by existing components
  const convertedLeads: Lead[] = filteredLeads.map(lead => ({
    id: lead.id,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    author_profile_id: lead.author_profile_id,
    author_name: lead.author_name || '',
    author_headline: lead.author_headline || '',
    author_profile_url: lead.author_profile_url || '',
    company_name: lead.company_name || '',
    company_position: lead.company_position || '',
    company_linkedin_id: lead.company_linkedin_id || '',
    text: lead.latest_post?.text || '',
    title: lead.latest_post?.title || '',
    url: lead.latest_post?.url || '',
    posted_at_iso: lead.latest_post?.posted_at_iso || lead.created_at,
    posted_at_timestamp: lead.latest_post?.posted_at_timestamp || new Date(lead.created_at).getTime(),
    openai_step2_localisation: lead.latest_post?.openai_step2_localisation || '',
    openai_step3_categorie: lead.latest_post?.openai_step3_categorie || '',
    openai_step3_postes_selectionnes: lead.latest_post?.openai_step3_postes_selectionnes || [],
    openai_step3_justification: lead.latest_post?.openai_step3_justification || '',
    unipile_company: lead.company_name || '',
    unipile_position: lead.company_position || '',
    unipile_company_linkedin_id: lead.company_linkedin_id || '',
    phone_number: lead.phone_number,
    phone_retrieved_at: lead.phone_retrieved_at,
    approach_message: lead.approach_message,
    approach_message_generated: lead.approach_message_generated,
    approach_message_generated_at: lead.approach_message_generated_at,
    is_client_lead: lead.is_client_lead,
    matched_client_name: lead.matched_client_name,
    matched_client_id: lead.matched_client_id,
    last_contact_at: lead.last_contact_at,
    linkedin_message_sent_at: lead.linkedin_message_sent_at,
    phone_contact_status: lead.phone_contact_status,
    phone_contact_at: lead.phone_contact_at,
    phone_contact_by_user_id: lead.phone_contact_by_user_id,
    phone_contact_by_user_name: lead.phone_contact_by_user_name,
    last_updated_at: lead.last_updated_at,
    latest_post_date: lead.latest_post?.posted_at_iso || null,
    latest_post_url: lead.latest_post?.url || null,
    latest_post_urn: null, // This field doesn't exist in the new structure
    processing_status: lead.processing_status || 'completed'
  }));

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleSidebar: toggleSidebar,
    onNextItem: () => {
      if (selectedLeadIndex !== null && selectedLeadIndex < convertedLeads.length - 1) {
        setSelectedLeadIndex(selectedLeadIndex + 1);
      } else if (convertedLeads.length > 0) {
        setSelectedLeadIndex(0);
      }
    },
    onPreviousItem: () => {
      if (selectedLeadIndex !== null && selectedLeadIndex > 0) {
        setSelectedLeadIndex(selectedLeadIndex - 1);
      } else if (convertedLeads.length > 0) {
        setSelectedLeadIndex(convertedLeads.length - 1);
      }
    },
    enabled: true
  });

  // Touch gestures
  useTouchGestures({
    onSwipeLeft: () => {
      if (selectedLeadIndex !== null && selectedLeadIndex < convertedLeads.length - 1) {
        setSelectedLeadIndex(selectedLeadIndex + 1);
      } else if (convertedLeads.length > 0) {
        setSelectedLeadIndex(0);
      }
    },
    onSwipeRight: () => {
      if (selectedLeadIndex !== null && selectedLeadIndex > 0) {
        setSelectedLeadIndex(selectedLeadIndex - 1);
      } else if (convertedLeads.length > 0) {
        setSelectedLeadIndex(convertedLeads.length - 1);
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
            leads={convertedLeads} 
            visibleColumns={visibleColumns}
            onActionCompleted={handleActionCompleted}
            selectedLeadIndex={selectedLeadIndex}
            onLeadSelect={setSelectedLeadIndex}
          />
        ) : (
          <div className="px-6 pb-6">
            <CardView 
              leads={convertedLeads}
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
