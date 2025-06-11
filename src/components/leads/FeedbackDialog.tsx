
import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
    // Données OpenAI Steps
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
  const { toast } = useToast();
  const { user } = useAuth();

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
      // Préparer les données pour le webhook N8N avec les données OpenAI
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
        // Données des 3 steps OpenAI
        openai_analysis: {
          step1: {
            recrute_poste: lead.openai_step1_recrute_poste,
            postes: lead.openai_step1_postes,
          },
          step2: {
            reponse: lead.openai_step2_reponse,
            langue: lead.openai_step2_langue,
            localisation_detectee: lead.openai_step2_localisation,
            raison: lead.openai_step2_raison,
          },
          step3: {
            categorie: lead.openai_step3_categorie,
            postes_selectionnes: lead.openai_step3_postes_selectionnes,
            justification: lead.openai_step3_justification,
          }
        }
      };

      console.log('🔔 Sending feedback to N8N webhook with OpenAI data:', feedbackData);

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
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
          </AlertDialogDescription>
        </AlertDialogHeader>

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

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isSubmitting}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={isSubmitting}
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
