
import { useState } from 'react';
import { useLeads } from '@/hooks/useLeads';
import DraggableTable from '@/components/leads/DraggableTable';
import CardView from '@/components/leads/CardView';
import LeadsFilters from '@/components/leads/LeadsFilters';
import { SidebarTrigger } from '@/components/ui/sidebar';

const Leads = () => {
  const { 
    filteredLeads, 
    loading, 
    selectedCategories, 
    setSelectedCategories,
    selectedDateFilter,
    setSelectedDateFilter
  } = useLeads();
  
  const [visibleColumns, setVisibleColumns] = useState([
    'posted_date', 
    'job_title', 
    'author_name', 
    'company', 
    'post_url', 
    'status', 
    'category', 
    'location'
  ]);

  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  if (loading) {
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
      <div className="flex items-center mb-6">
        <SidebarTrigger />
      </div>
      
      <div className="space-y-6">
        <LeadsFilters
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          visibleColumns={visibleColumns}
          onColumnsChange={setVisibleColumns}
          selectedDateFilter={selectedDateFilter}
          onDateFilterChange={setSelectedDateFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        
        <div className="bg-white rounded-lg shadow">
          {viewMode === 'table' ? (
            <DraggableTable 
              leads={filteredLeads} 
              visibleColumns={visibleColumns}
            />
          ) : (
            <CardView leads={filteredLeads} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Leads;
