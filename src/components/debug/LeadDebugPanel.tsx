
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ApproachMessageSection from './sections/ApproachMessageSection';
import CompanyInfoSection from './sections/CompanyInfoSection';

interface LeadDebugPanelProps {
  leadId?: string;
}

const LeadDebugPanel = ({ leadId: initialLeadId }: LeadDebugPanelProps) => {
  const [leadId, setLeadId] = useState(initialLeadId || '');
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeadData = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching lead data for:', id);
      
      // Essayer d'abord dans leads
      const { data: leadDataResult, error: leadError } = await supabase
        .from('leads')
        .select(`
          *,
          companies:company_id (
            id,
            name,
            description,
            industry,
            company_size,
            headquarters,
            website,
            follower_count,
            linkedin_id
          )
        `)
        .eq('id', id)
        .single();

      if (leadError && leadError.code !== 'PGRST116') {
        setError(`Erreur lors de la récupération du lead: ${leadError.message}`);
        return;
      }

      if (leadDataResult) {
        console.log('✅ Lead found:', leadDataResult);
        setLeadData({ type: 'lead', data: leadDataResult });
        return;
      }

      // Si pas trouvé dans leads, essayer dans linkedin_posts
      const { data: postData, error: postError } = await supabase
        .from('linkedin_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (postError) {
        setError(`Aucun lead ou post trouvé avec cet ID: ${postError.message}`);
        return;
      }

      console.log('✅ LinkedIn post found:', postData);
      setLeadData({ type: 'post', data: postData });

    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLeadData(leadId);
    }
  }, []);

  const handleFetch = () => {
    if (leadId.trim()) {
      fetchLeadData(leadId.trim());
    }
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Debug Lead - Investigation complète</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              placeholder="ID du lead ou post à investiguer"
              className="flex-1"
            />
            <Button onClick={handleFetch} disabled={loading}>
              {loading ? 'Chargement...' : 'Analyser'}
            </Button>
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          {leadData && (
            <div className="space-y-6">
              {/* Type de données */}
              <div>
                <Badge variant={leadData.type === 'lead' ? 'default' : 'secondary'}>
                  {leadData.type === 'lead' ? 'Lead final' : 'Post LinkedIn'}
                </Badge>
              </div>

              {/* Informations générales */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Informations générales</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>ID:</strong> {leadData.data.id}</div>
                  <div><strong>Nom:</strong> {leadData.data.author_name}</div>
                  <div><strong>Status:</strong> <Badge>{leadData.data.processing_status}</Badge></div>
                  <div><strong>Créé le:</strong> {new Date(leadData.data.created_at).toLocaleString()}</div>
                  <div><strong>Mis à jour:</strong> {new Date(leadData.data.updated_at || leadData.data.last_updated_at).toLocaleString()}</div>
                  <div><strong>Dataset ID:</strong> {leadData.data.apify_dataset_id}</div>
                </div>
              </div>

              {/* Message d'approche */}
              <ApproachMessageSection leadData={leadData.data} />

              {/* Informations d'entreprise */}
              <CompanyInfoSection leadData={leadData.data} />

              {/* OpenAI Steps */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Résultats OpenAI</h3>
                <div className="space-y-3">
                  <div>
                    <strong>Step 3 - Postes sélectionnés:</strong>
                    <div className="mt-1">
                      {leadData.data.openai_step3_postes_selectionnes?.map((poste: string, index: number) => (
                        <Badge key={index} variant="outline" className="mr-1">
                          {poste}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div><strong>Catégorie:</strong> {leadData.data.openai_step3_categorie}</div>
                  <div><strong>Localisation:</strong> {leadData.data.openai_step2_localisation}</div>
                </div>
              </div>

              {/* Raw data inspection */}
              <details className="border rounded p-3">
                <summary className="font-semibold cursor-pointer">Données brutes (JSON)</summary>
                <pre className="mt-3 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(leadData.data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadDebugPanel;
