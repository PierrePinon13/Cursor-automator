import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface LeadDebugPanelProps {
  leadId?: string;
}

const LeadDebugPanel = ({ leadId: initialLeadId }: LeadDebugPanelProps) => {
  const [leadId, setLeadId] = useState(initialLeadId || 'c669e294-804f-408d-993f-79b84e199301');
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeadData = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('linkedin_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        setError(`Erreur lors de la récupération: ${fetchError.message}`);
        return;
      }

      if (!data) {
        setError('Aucun lead trouvé avec cet ID');
        return;
      }

      setLeadData(data);
      console.log('Lead data complet:', data);
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
          <CardTitle>Debug Lead - Investigation Message d'Approche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              placeholder="ID du lead à investiguer"
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
              {/* Informations générales */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Informations générales</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Nom:</strong> {leadData.author_name}</div>
                  <div><strong>Status:</strong> <Badge>{leadData.processing_status}</Badge></div>
                  <div><strong>Créé le:</strong> {new Date(leadData.created_at).toLocaleString()}</div>
                  <div><strong>Mis à jour:</strong> {new Date(leadData.updated_at).toLocaleString()}</div>
                  <div><strong>Client lead:</strong> {leadData.is_client_lead ? 'Oui' : 'Non'}</div>
                  <div><strong>Client matché:</strong> {leadData.matched_client_name || 'Aucun'}</div>
                </div>
              </div>

              {/* Message d'approche - Investigation principale */}
              <div className="border-2 border-blue-200 p-4 rounded-lg bg-blue-50">
                <h3 className="font-semibold text-lg mb-3 text-blue-800">🔍 Message d'Approche - Investigation</h3>
                <div className="space-y-3">
                  <div>
                    <strong>Message généré:</strong>
                    <Badge className="ml-2">
                      {leadData.approach_message_generated ? 'Oui' : 'Non'}
                    </Badge>
                  </div>
                  
                  {leadData.approach_message_generated_at && (
                    <div>
                      <strong>Généré le:</strong> {new Date(leadData.approach_message_generated_at).toLocaleString()}
                    </div>
                  )}

                  <div>
                    <strong>Message stocké:</strong>
                    <div className="mt-2 p-3 bg-white border rounded text-sm whitespace-pre-wrap">
                      {leadData.approach_message || '❌ Aucun message stocké'}
                    </div>
                  </div>

                  {leadData.approach_message_error && (
                    <div>
                      <strong>Détails d'erreur:</strong>
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {leadData.approach_message_error}
                      </div>
                      
                      {/* Analyse des détails de retry */}
                      {leadData.approach_message_error.includes('attempts') && (
                        <div className="mt-2 text-xs text-gray-600">
                          {leadData.approach_message_error.includes('[Used default template]') ? (
                            <span className="text-orange-600">⚠️ Template par défaut utilisé après échec des tentatives OpenAI</span>
                          ) : (
                            <span className="text-red-600">❌ Toutes les tentatives ont échoué</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Indicateur de qualité du message */}
                  <div className="mt-3 p-2 rounded border">
                    <strong>Qualité du message:</strong>
                    {leadData.approach_message_generated && leadData.approach_message && !leadData.approach_message_error?.includes('[Used default template]') ? (
                      <span className="ml-2 text-green-600">✅ Message IA de qualité</span>
                    ) : leadData.approach_message_error?.includes('[Used default template]') ? (
                      <span className="ml-2 text-orange-600">⚠️ Template par défaut</span>
                    ) : (
                      <span className="ml-2 text-red-600">❌ Échec de génération</span>
                    )}
                  </div>
                </div>
              </div>

              {/* OpenAI Steps */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Résultats OpenAI</h3>
                <div className="space-y-3">
                  <div>
                    <strong>Step 3 - Postes sélectionnés:</strong>
                    <div className="mt-1">
                      {leadData.openai_step3_postes_selectionnes?.map((poste: string, index: number) => (
                        <Badge key={index} variant="outline" className="mr-1">
                          {poste}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div><strong>Catégorie:</strong> {leadData.openai_step3_categorie}</div>
                  <div><strong>Localisation:</strong> {leadData.openai_step2_localisation}</div>
                </div>
              </div>

              {/* Données brutes pour debug */}
              <details className="border rounded p-3">
                <summary className="font-semibold cursor-pointer">Données complètes (JSON)</summary>
                <pre className="mt-3 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(leadData, null, 2)}
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
