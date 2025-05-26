
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, User, MapPin, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

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

  const getCategoryColor = (category: string) => {
    const colors = {
      'Tech': 'bg-blue-100 text-blue-800',
      'Business': 'bg-green-100 text-green-800',
      'Product': 'bg-purple-100 text-purple-800',
      'Executive Search': 'bg-red-100 text-red-800',
      'Comptelio': 'bg-yellow-100 text-yellow-800',
      'RH': 'bg-pink-100 text-pink-800',
      'Freelance': 'bg-orange-100 text-orange-800',
      'Data': 'bg-indigo-100 text-indigo-800',
      'Autre': 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Chargement des leads...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Leads LinkedIn</h2>
          <p className="text-muted-foreground">
            Publications LinkedIn identifiées comme opportunités de recrutement en France
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Leads qualifiés ({leads.length})
            </CardTitle>
            <CardDescription>
              Publications ayant passé le processus de qualification automatique
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun lead qualifié pour le moment</p>
                <p className="text-sm">Les publications LinkedIn seront automatiquement analysées</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auteur</TableHead>
                      <TableHead>Publication</TableHead>
                      <TableHead>Postes</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{lead.author_name || 'N/A'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {truncateText(lead.author_headline || '', 50)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 max-w-xs">
                            {lead.title && (
                              <p className="font-medium text-sm">{truncateText(lead.title, 60)}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {truncateText(lead.text, 80)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {poste}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(lead.openai_step3_categorie)}>
                            {lead.openai_step3_categorie}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{lead.openai_step2_localisation || 'France'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">
                              {lead.posted_at_iso 
                                ? new Date(lead.posted_at_iso).toLocaleDateString('fr-FR')
                                : new Date(lead.created_at).toLocaleDateString('fr-FR')
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(lead.url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(lead.author_profile_url, '_blank')}
                            >
                              <User className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Leads;
