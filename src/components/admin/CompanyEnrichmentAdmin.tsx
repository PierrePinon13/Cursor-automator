
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Play, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyEnrichment } from '@/hooks/useCompanyEnrichment';
import { useToast } from '@/hooks/use-toast';

interface CompanyEnrichmentStatus {
  linkedin_id: string;
  name: string | null;
  enrichment_status: string;
  enrichment_source: string | null;
  last_enriched_at: string | null;
  logo: string | null;
}

interface QueueItem {
  id: string;
  linkedin_id: string;
  status: string;
  source: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const CompanyEnrichmentAdmin = () => {
  const [companies, setCompanies] = useState<CompanyEnrichmentStatus[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    enriched: 0,
    processing: 0,
    error: 0
  });
  
  const { triggerBulkEnrichment, loading: enrichmentLoading } = useCompanyEnrichment();
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch companies with enrichment status
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('linkedin_id, name, enrichment_status, enrichment_source, last_enriched_at, logo')
        .order('last_enriched_at', { ascending: false, nullsFirst: false })
        .limit(100);

      if (companiesError) throw companiesError;

      // Fetch queue items
      const { data: queueData, error: queueError } = await supabase
        .from('company_enrichment_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (queueError) throw queueError;

      setCompanies(companiesData || []);
      setQueueItems(queueData || []);

      // Calculate stats
      const statusCounts = (companiesData || []).reduce((acc, company) => {
        acc.total++;
        acc[company.enrichment_status || 'pending']++;
        return acc;
      }, { total: 0, pending: 0, enriched: 0, processing: 0, error: 0 });

      setStats(statusCounts);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données d'enrichissement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enriched':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Enrichi</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />En cours</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Erreur</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  const getSourceBadge = (source: string | null) => {
    switch (source) {
      case 'post':
        return <Badge variant="outline">Post LinkedIn</Badge>;
      case 'job':
        return <Badge variant="outline">Offre d'emploi</Badge>;
      case 'manual':
        return <Badge variant="outline">Manuel</Badge>;
      case 'auto':
        return <Badge variant="outline">Automatique</Badge>;
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  const handleBulkEnrichment = async () => {
    const result = await triggerBulkEnrichment();
    if (result) {
      // Refresh data after a short delay
      setTimeout(() => {
        fetchData();
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enrichissement des entreprises</h2>
          <p className="text-muted-foreground">Gestion et suivi de l'enrichissement automatique</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button 
            onClick={handleBulkEnrichment} 
            disabled={enrichmentLoading}
            size="sm"
          >
            {enrichmentLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Enrichissement en masse
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Enrichis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.enriched}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Erreurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.error}</div>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Entreprises</CardTitle>
          <CardDescription>État de l'enrichissement des entreprises</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>LinkedIn ID</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Dernier enrichissement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.linkedin_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {company.logo && (
                        <img 
                          src={company.logo} 
                          alt={company.name || ''} 
                          className="h-6 w-6 rounded object-cover"
                        />
                      )}
                      <span className="font-medium">{company.name || 'Nom non disponible'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{company.linkedin_id}</TableCell>
                  <TableCell>{getStatusBadge(company.enrichment_status)}</TableCell>
                  <TableCell>{getSourceBadge(company.enrichment_source)}</TableCell>
                  <TableCell>
                    {company.last_enriched_at 
                      ? new Date(company.last_enriched_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Jamais'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Queue Table */}
      {queueItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>File d'attente</CardTitle>
            <CardDescription>Tâches d'enrichissement en cours et récentes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LinkedIn ID</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Créé</TableHead>
                  <TableHead>Erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.linkedin_id}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{getSourceBadge(item.source)}</TableCell>
                    <TableCell>
                      {new Date(item.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      {item.error_message && (
                        <span className="text-sm text-red-600 truncate max-w-xs" title={item.error_message}>
                          {item.error_message}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompanyEnrichmentAdmin;
