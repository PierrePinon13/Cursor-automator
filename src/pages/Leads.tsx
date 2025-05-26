
import { useState } from 'react';
import { useLeads } from '@/hooks/useLeads';
import DraggableTable from '@/components/leads/DraggableTable';
import LeadsFilters from '@/components/leads/LeadsFilters';
import { exportLeadsToCSV } from '@/utils/csvExport';
import { SidebarTrigger } from '@/components/ui/sidebar';

const Leads = () => {
  const { filteredLeads, loading, selectedCategories, setSelectedCategories } = useLeads();
  
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

  const handleExport = () => {
    exportLeadsToCSV(filteredLeads, visibleColumns);
  };

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
          onExport={handleExport}
        />
        
        <div className="bg-white rounded-lg shadow">
          <DraggableTable 
            leads={filteredLeads} 
            visibleColumns={visibleColumns}
          />
        </div>
      </div>
    </div>
  );
};

export default Leads;
