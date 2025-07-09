
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Save, Play, Loader2 } from 'lucide-react';
import { JobSearchFilters } from './JobSearchFilters';
import { PersonaFilters } from './PersonaFilters';
import { MessageTemplate } from './MessageTemplate';
import { toast } from '@/hooks/use-toast';

// Harmonise le type SelectedLocation pour éviter les erreurs de compatibilité
// (si déjà importé ailleurs, adapte ici)
interface SelectedLocation {
  label: string;
  geoId: number | null;
  isResolved: boolean;
}

interface SearchJobsFormProps {
  onSubmit: (config: any) => Promise<any>;
  onCancel: () => void;
  initialData?: any;
}

export const SearchJobsForm = ({ onSubmit, onCancel, initialData }: SearchJobsFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const [jobFilters, setJobFilters] = useState({
    keywords: '',
    location: [] as SelectedLocation[],
    date_posted: '',
    category: [] as string[]
  });

  const [personaFilters, setPersonaFilters] = useState({
    role: [] as string[],
    location: [] as SelectedLocation[]
  });

  const DEFAULT_TEMPLATE = `Bonjour {{firstName}},

J'ai vu que vous recherchiez un {{jobTitle}}.

J'ai des candidats que je peux vous présenter si vous êtes toujours en recherche.

Souhaitez-vous en discuter ?`;

  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_TEMPLATE);

  // Charger les données initiales si fournies
  useEffect(() => {
    if (initialData) {
      setJobFilters(initialData.jobFilters || jobFilters);

      // Ensure persona role is properly formatted as array
      const initialPersonaFilters = initialData.personaFilters || personaFilters;
      setPersonaFilters({
        role: Array.isArray(initialPersonaFilters.role)
          ? initialPersonaFilters.role
          : (initialPersonaFilters.role?.keywords || []),
        location: Array.isArray(initialPersonaFilters.location) 
          ? initialPersonaFilters.location 
          : []
      });

      setMessageTemplate(initialData.messageTemplate || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const generateSearchName = () => {
    const keywords = jobFilters.keywords || 'Recherche';
    const locations = jobFilters.location.length > 0 
      ? jobFilters.location.map(l => l.label).join(', ') 
      : '';
    const categories = Array.isArray(jobFilters.category) && jobFilters.category.length > 0
      ? ` - ${jobFilters.category.join(', ')}`
      : '';
    
    return `${keywords}${locations ? ` à ${locations}` : ''}${categories}`;
  };

  const validateForm = () => {
    if (!jobFilters.keywords.trim()) {
      toast({
        title: "Validation échouée",
        description: "Les mots-clés sont obligatoires pour la recherche d'emploi.",
        variant: "destructive",
      });
      return false;
    }
    
    if (personaFilters.role.length === 0) {
      toast({
        title: "Validation échouée", 
        description: "Veuillez sélectionner au moins un titre de poste pour le ciblage persona.",
        variant: "destructive",
      });
      return false;
    }
    
    if (!personaFilters.location || personaFilters.location.length === 0) {
      toast({
        title: "Validation échouée",
        description: "La localisation des profils est obligatoire pour le ciblage persona.",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (saveOnly = false) => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Préparer la localisation pour n8n :
      // Si la localisation a un radius, on le garde, sinon juste le label
      const preparedLocations = jobFilters.location.map(loc => {
        const l = loc as any;
        if (l && typeof l === 'object' && 'label' in l) {
          return l.radius !== undefined ? { label: l.label, radius: l.radius } : { label: l.label };
        }
        return { label: String(l) };
      });

      const config = {
        name: generateSearchName(),
        search_jobs: {
          ...jobFilters,
          location: preparedLocations
        },
        personna_filters: {
          ...personaFilters,
          role: { keywords: personaFilters.role }
        },
        message_template: messageTemplate.trim() || undefined,
        saveOnly
      };

      await onSubmit(config);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl text-gray-900">
              {initialData ? 'Modifier la recherche' : 'Nouvelle recherche d\'emplois'}
            </CardTitle>
            <CardDescription className="text-base text-gray-600 mt-2">
              Configurez votre recherche d'offres d'emploi et le ciblage des prospects
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-10">
        {/* Filtres de recherche d'emploi */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">1</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Recherche d'emplois
            </h3>
          </div>
          <JobSearchFilters
            filters={jobFilters}
            onChange={setJobFilters}
          />
        </div>

        {/* Filtres de persona */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-sm">2</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Ciblage des prospects
            </h3>
          </div>
          <PersonaFilters
            filters={personaFilters}
            onChange={setPersonaFilters}
          />
        </div>

        {/* Template de message */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">3</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Message LinkedIn
            </h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Optionnel
            </span>
          </div>
          <MessageTemplate
            template={messageTemplate}
            onChange={setMessageTemplate}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-6 border-t bg-gray-50/50 -mx-8 px-8 -mb-8 pb-8 rounded-b-lg">
          <Button variant="outline" onClick={onCancel} className="px-6">
            Annuler
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
              className="px-6"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Sauvegarder
            </Button>
            
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
              className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Lancer la recherche
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
