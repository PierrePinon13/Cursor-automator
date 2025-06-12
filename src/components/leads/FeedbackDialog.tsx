
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Linkedin } from 'lucide-react';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: string;
    author_name: string;
    author_profile_url?: string;
    title?: string;
    text?: string;
    url?: string;
    // Données OpenAI Steps (partielles depuis leads)
    openai_step1_recrute_poste?: string;
    openai_step1_postes?: string;
    openai_step2_reponse?: string;
    openai_step2_langue?: string;
    openai_step2_localisation?: string;
    openai_step2_raison?: string;
    openai_step3_categorie?: string;
    openai_step3_postes_selectionnes?: string[];
    openai_step3_justification?: string;
  };
  onFeedbackSubmitted: () => void;
}

const FeedbackDialog = ({ open, onOpenChange, lead, onFeedbackSubmitted }: FeedbackDialogProps) => {
  const [category1, setCategory1] = useState(''); // Le lead ne cherche pas à recruter
  const [category2, setCategory2] = useState(''); // La localisation des postes ne convient pas
  const [category3, setCategory3] = useState(''); // Les postes recherchés ne conviennent pas
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkedinPostData, setLinkedinPostData] = useState<any>(null);
  const [loadingPostData, setLoadingPostData] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Récupérer les données complètes du post LinkedIn quand le dialogue s'ouvre
  useEffect(() => {
    if (open && lead.id) {
      fetchLinkedinPostData();
    }
  }, [open, lead.id]);

  const fetchLinkedinPostData = async () => {
    setLoadingPostData(true);
    try {
      console.log('🔍 Fetching LinkedIn post data for lead:', lead.id);
      
      // Chercher le post LinkedIn correspondant à ce lead
      const { data: linkedinPost, error } = await supabase
        .from('linkedin_posts')
        .select('*')
        .eq('lead_id', lead.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching LinkedIn post data:', error);
        // Continuer avec les données partielles du lead
        return;
      }

      if (linkedinPost) {
        console.log('✅ LinkedIn post data found:', linkedinPost);
        setLinkedinPostData(linkedinPost);
      } else {
        console.log('⚠️ No LinkedIn post found for lead, using lead data only');
      }
    } catch (error) {
      console.error('❌ Error in fetchLinkedinPostData:', error);
    } finally {
      setLoadingPostData(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour envoyer un feedback",
        variant: "destructive",
      });
      return;
    }

    // Vérifier qu'au moins une catégorie a du contenu
    if (!category1.trim() && !category2.trim() && !category3.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir au moins une catégorie de feedback",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Utiliser les données du post LinkedIn si disponibles, sinon fallback sur les données du lead
      const sourceData = linkedinPostData || lead;

      // Préparer les données pour le webhook N8N avec les données OpenAI complètes
      const feedbackData = {
        lead_id: lead.id,
        author_name: lead.author_name,
        author_profile_url: lead.author_profile_url,
        post_title: lead.title,
        post_text: lead.text,
        post_url: lead.url,
        reported_by_user_id: user.id,
        reported_by_user_name: user.user_metadata?.full_name || user.email,
        reported_at: new Date().toISOString(),
        feedback_categories: {
          not_recruiting: category1.trim() || null,
          location_mismatch: category2.trim() || null,
          position_mismatch: category3.trim() || null,
        },
        // Données OpenAI complètes regroupées par step
        openai_step1: {
          recrute_poste: sourceData.openai_step1_recrute_poste,
          postes: sourceData.openai_step1_postes,
          response: sourceData.openai_step1_response || null,
        },
        openai_step2: {
          reponse: sourceData.openai_step2_reponse,
          langue: sourceData.openai_step2_langue,
          localisation_detectee: sourceData.openai_step2_localisation,
          raison: sourceData.openai_step2_raison,
          response: sourceData.openai_step2_response || null,
        },
        openai_step3: {
          categorie: sourceData.openai_step3_categorie,
          postes_selectionnes: sourceData.openai_step3_postes_selectionnes,
          justification: sourceData.openai_step3_justification,
          response: sourceData.openai_step3_response || null,
        }
      };

      console.log('🔔 Sending feedback to N8N webhook with complete OpenAI data:', feedbackData);

      // Envoyer au webhook N8N
      const webhookResponse = await fetch('https://n8n.getpro.co/webhook/8c1fc6fc-7581-4579-9ca0-eae618a90004', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook responded with status: ${webhookResponse.status}`);
      }

      console.log('✅ Feedback sent to N8N successfully');

      // Enregistrer dans la table mistargeted_posts
      const { error: dbError } = await supabase
        .from('mistargeted_posts')
        .insert({
          lead_id: lead.id,
          reported_by_user_id: user.id,
          reported_by_user_name: user.user_metadata?.full_name || user.email,
          author_name: lead.author_name,
          author_profile_url: lead.author_profile_url,
          reason: `Feedback détaillé: ${JSON.stringify(feedbackData.feedback_categories)}`,
        });

      if (dbError) {
        console.error('❌ Error saving to mistargeted_posts:', dbError);
        // On continue quand même car le webhook principal a fonctionné
      }

      // Marquer le lead comme mal ciblé (filtré)
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          processing_status: 'mistargeted',
          last_updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error('❌ Error updating lead status:', updateError);
        throw updateError;
      }

      toast({
        title: "Feedback envoyé",
        description: "Votre feedback a été envoyé avec succès et le lead a été filtré.",
      });

      onOpenChange(false);
      onFeedbackSubmitted();

    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le feedback. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setCategory1('');
    setCategory2('');
    setCategory3('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Signaler une publication mal ciblée</AlertDialogTitle>
          <AlertDialogDescription className="text-sm space-y-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-medium text-amber-800">Instructions importantes :</p>
              <ul className="text-amber-700 text-xs list-disc list-inside space-y-1 mt-1">
                <li>Soyez concis et précis dans vos réponses</li>
                <li>Remplissez uniquement la ou les section(s) pertinente(s)</li>
                <li>Évitez les répétitions entre les catégories</li>
              </ul>
            </div>
            <p>Publication de <strong>{lead.author_name}</strong></p>
            {loadingPostData && (
              <p className="text-xs text-gray-500">Chargement des données complètes...</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Layout 2 colonnes */}
        <div className="flex gap-6">
          {/* Colonne gauche - Publication LinkedIn */}
          <div className="w-1/2">
            <Card className="border-blue-200 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-blue-800">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Linkedin className="h-5 w-5 text-white" />
                  </div>
                  <span>Publication LinkedIn</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contenu de la publication */}
                {lead.text ? (
                  <div className="text-sm text-gray-700 leading-relaxed max-h-80 overflow-y-auto bg-gray-50 p-4 rounded-lg border">
                    <div className="whitespace-pre-wrap">{lead.text}</div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg border">
                    Aucun texte disponible
                  </div>
                )}

                {/* Lien vers la publication */}
                {lead.url && (
                  <Button 
                    variant="outline" 
                    className="w-full border-blue-200 hover:bg-blue-50" 
                    onClick={() => window.open(lead.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Voir la publication sur LinkedIn
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Formulaire de feedback */}
          <div className="w-1/2">
            <div className="space-y-4">
              {/* Catégorie 1 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Le lead ne cherche pas à recruter
                </label>
                <Textarea
                  value={category1}
                  onChange={(e) => setCategory1(e.target.value)}
                  placeholder="Expliquez pourquoi ce lead ne semble pas recruter..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Catégorie 2 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  La localisation des postes ne convient pas
                </label>
                <Textarea
                  value={category2}
                  onChange={(e) => setCategory2(e.target.value)}
                  placeholder="Précisez le problème de localisation..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Catégorie 3 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Les postes recherchés ne conviennent pas
                </label>
                <Textarea
                  value={category3}
                  onChange={(e) => setCategory3(e.target.value)}
                  placeholder="Expliquez pourquoi les postes ne correspondent pas..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isSubmitting}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={isSubmitting || loadingPostData}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? 'Envoi...' : 'Envoyer le feedback'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default FeedbackDialog;
