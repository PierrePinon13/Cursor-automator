
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OpenAIPrompt {
  step: number;
  prompt: string;
  updated_at?: string;
}

export const useOpenAIPrompts = () => {
  const [prompts, setPrompts] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadPrompts = async () => {
    try {
      console.log('🔍 Loading OpenAI prompts from Supabase...');
      
      // Essayons de récupérer les prompts depuis une table de configuration
      const { data, error } = await supabase
        .from('openai_prompts')
        .select('*')
        .in('step', [1, 2, 3])
        .order('step');

      if (error) {
        console.error('Error loading prompts:', error);
        // Si la table n'existe pas encore, on utilise des prompts par défaut
        setPrompts({
          1: '// Prompt Step 1 - Détection des offres d\'emploi\n// Ce prompt analyse si un post LinkedIn est une offre d\'emploi\n\nAnalyse le post LinkedIn suivant et détermine s\'il s\'agit d\'une offre d\'emploi ou d\'un recrutement.\n\nRéponds uniquement par "Oui" ou "Non".',
          2: '// Prompt Step 2 - Vérification localisation France\n// Ce prompt vérifie si l\'offre d\'emploi est localisée en France\n\nAnalyse cette offre d\'emploi et détermine si elle est localisée en France.\n\nRéponds uniquement par "Oui" ou "Non".',
          3: '// Prompt Step 3 - Catégorisation des postes\n// Ce prompt catégorise les offres d\'emploi selon les spécialités\n\nCatégorise cette offre d\'emploi selon les catégories suivantes :\n- Tech\n- Business\n- Product\n- Executive Search\n- RH\n- Data\n- Autre\n\nRéponds uniquement par le nom de la catégorie.'
        });
      } else {
        const promptsMap: Record<number, string> = {};
        data.forEach((prompt) => {
          promptsMap[prompt.step] = prompt.prompt || '';
        });
        
        // Compléter avec des prompts par défaut si certains steps sont manquants
        [1, 2, 3].forEach(step => {
          if (!promptsMap[step]) {
            promptsMap[step] = `// Prompt Step ${step} par défaut\n// Ce prompt nécessite une configuration`;
          }
        });
        
        setPrompts(promptsMap);
        console.log(`✅ Loaded ${data.length} prompts from database`);
      }
    } catch (error) {
      console.error('Error in loadPrompts:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les prompts depuis Supabase.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = async (step: number, prompt: string, confirmation: string) => {
    if (confirmation !== 'je confirme vouloir changer le prompt utilisé en production') {
      toast({
        title: "Confirmation requise",
        description: 'Vous devez écrire exactement "je confirme vouloir changer le prompt utilisé en production" pour valider.',
        variant: "destructive",
      });
      return false;
    }

    setSaving(true);
    try {
      console.log(`💾 Saving prompt for step ${step}...`);
      
      const { error } = await supabase
        .from('openai_prompts')
        .upsert({
          step,
          prompt,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'step'
        });

      if (error) {
        console.error('Error saving prompt:', error);
        toast({
          title: "Erreur",
          description: `Impossible de sauvegarder le prompt Step ${step}.`,
          variant: "destructive",
        });
        return false;
      }

      setPrompts(prev => ({
        ...prev,
        [step]: prompt
      }));

      toast({
        title: "Prompt sauvegardé",
        description: `Le prompt Step ${step} a été mis à jour avec succès en production.`,
      });
      
      console.log(`✅ Prompt step ${step} saved successfully`);
      return true;
    } catch (error) {
      console.error('Error in savePrompt:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  return {
    prompts,
    loading,
    saving,
    savePrompt,
    refreshPrompts: loadPrompts
  };
};
