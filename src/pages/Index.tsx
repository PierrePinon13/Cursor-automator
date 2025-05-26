
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Filter } from 'lucide-react';
import DraggableTable from '@/components/leads/DraggableTable';
import MultiSelectFilter from '@/components/leads/MultiSelectFilter';

interface Lead {
  id: string;
  created_at: string;
  author_name: string;
  author_headline: string;
  author_profile_url: string;
  text: string;
  title: string;
  url: string;
  posted_at_iso: string;
  openai_step2_localisation: string;
  openai_step3_categorie: string;
  openai_step3_postes_selectionnes: string[];
  openai_step3_justification: string;
}

const categoryOptions = [
  { value: 'Tech', label: 'Tech' },
  { value: 'Business', label: 'Business' },
  { value: 'Product', label: 'Product' },
  { value: 'Executive Search', label: 'Executive Search' },
  { value: 'Comptelio', label: 'Comptelio' },
  { value: 'RH', label: 'RH' },
  { value: 'Freelance', label: 'Freelance' },
  { value: 'Data', label: 'Data' },
  { value: 'Autre', label: 'Autre' },
];

const columnOptions = [
  { value: 'posted_date', label: 'Posted Date' },
  { value: 'job_title', label: 'Titre de poste recherché' },
  { value: 'author_name', label: 'Prénom et Nom' },
  { value: 'company', label: 'Entreprise' },
  { value: 'post_url', label: 'URL du post' },
  { value: 'status', label: 'Statut' },
  { value: 'category', label: 'Catégorie' },
  { value: 'location', label: 'Localisation' },
];

const Index = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'posted_date',
    'job_title', 
    'author_name',
    'company',
    'post_url',
    'status'
  ]);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, selectedCategories]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('linkedin_posts')
        .select(`
          id,
          created_at,
          author_name,
          author_headline,
          author_profile_url,
          text,
          title,
          url,
          posted_at_iso,
          openai_step2_localisation,
          openai_step3_categorie,
          openai_step3_postes_selectionnes,
          openai_step3_justification
        `)
        .eq('processing_status', 'completed')
        .not('openai_step3_categorie', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = leads;

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(lead => 
        selectedCategories.includes(lead.openai_step3_categorie)
      );
    }

    setFilteredLeads(filtered);
  };

  const exportToCSV = () => {
    const headers = visibleColumns.map(colId => 
      columnOptions.find(opt => opt.value === colId)?.label || colId
    );
    
    const csvContent = [
      headers.join(','),
      ...filteredLeads.map(lead => {
        return visibleColumns.map(colId => {
          switch(colId) {
            case 'posted_date':
              return lead.posted_at_iso 
                ? new Date(lead.posted_at_iso).toLocaleDateString('fr-FR')
                : new Date(lead.created_at).toLocaleDateString('fr-FR');
            case 'job_title':
              return `"${lead.openai_step3_postes_selectionnes?.join(', ') || ''}"`;
            case 'author_name':
              return `"${lead.author_name || ''}"`;
            case 'company':
              return `"${lead.author_headline || ''}"`;
            case 'post_url':
              return lead.url;
            case 'status':
            case 'category':
              return lead.openai_step3_categorie || '';
            case 'location':
              return lead.openai_step2_localisation || 'France';
            default:
              return '';
          }
        }).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Leads LinkedIn
          </h1>
          <p className="text-gray-600">
            {filteredLeads.length} leads qualifiés sur {leads.length} au total
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Tableau des leads
              </CardTitle>
              <div className="flex items-center gap-3">
                <MultiSelectFilter
                  title="Catégories"
                  options={categoryOptions}
                  selectedValues={selectedCategories}
                  onSelectionChange={setSelectedCategories}
                />
                <MultiSelectFilter
                  title="Colonnes"
                  options={columnOptions}
                  selectedValues={visibleColumns}
                  onSelectionChange={setVisibleColumns}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="h-8"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun lead ne correspond aux filtres sélectionnés</p>
              </div>
            ) : (
              <DraggableTable 
                leads={filteredLeads} 
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
