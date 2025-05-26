
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Filter } from 'lucide-react';
import DraggableTable from '@/components/leads/DraggableTable';
import LeadsFilters from '@/components/leads/LeadsFilters';
import { useLeads } from '@/hooks/useLeads';

const Index = () => {
  const { filteredLeads, loading, selectedCategories, setSelectedCategories } = useLeads();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'posted_date',
    'job_title', 
    'author_name',
    'company',
    'post_url',
    'status'
  ]);

  const [selectedDateFilter, setSelectedDateFilter] = useState('all');

  const filterByDate = (leads: any[]) => {
    if (selectedDateFilter === 'all') return leads;
    
    const now = new Date();
    const cutoffTime = new Date();
    
    switch (selectedDateFilter) {
      case '24h':
        cutoffTime.setHours(now.getHours() - 24);
        break;
      case '48h':
        cutoffTime.setHours(now.getHours() - 48);
        break;
      case '7d':
        cutoffTime.setDate(now.getDate() - 7);
        break;
      default:
        return leads;
    }
    
    return leads.filter(lead => {
      const postDate = new Date(lead.posted_at_iso || lead.created_at);
      return postDate >= cutoffTime;
    });
  };

  const dateFilteredLeads = filterByDate(filteredLeads);

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
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Leads LinkedIn
          </h1>
          <p className="text-gray-600">
            {dateFilteredLeads.length} leads qualifiés
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <LeadsFilters
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              visibleColumns={visibleColumns}
              onColumnsChange={setVisibleColumns}
              selectedDateFilter={selectedDateFilter}
              onDateFilterChange={setSelectedDateFilter}
            />
          </CardHeader>
          <CardContent className="p-0">
            {dateFilteredLeads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun lead ne correspond aux filtres sélectionnés</p>
              </div>
            ) : (
              <DraggableTable 
                leads={dateFilteredLeads} 
                visibleColumns={visibleColumns}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
