import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, Play, Loader2 } from 'lucide-react';
import { JobSearchFilters } from './JobSearchFilters';
import { PersonaFilters } from './PersonaFilters';
import { MessageTemplate } from './MessageTemplate';
import { toast } from '@/hooks/use-toast';

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
  const [searchName, setSearchName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // date_posted: "" = toutes, sinon nombre de jours (1,2,7,14,30)
  const [jobFilters, setJobFilters] = useState({
    keywords: '',
    location: [] as SelectedLocation[],
    date_posted: '', // default: toutes
    sort_by: 'date'
  });

  const [personaFilters, setPersonaFilters] = useState({
    keywords: '',
    role: [] as string[],
    profile_language: 'fr'
  });

  const [messageTemplate, setMessageTemplate] = useState('');

  // Charger les données initiales si fournies
  useEffect(() => {
    if (initialData) {
      setSearchName(initialData.name || '');
      setJobFilters(initialData.jobFilters || jobFilters);

      // Ensure persona role is properly formatted as array
      const initialPersonaFilters = initialData.personaFilters || personaFilters;
      setPersonaFilters({
        ...initialPersonaFilters,
        role: Array.isArray(initialPersonaFilters.role)
          ? initialPersonaFilters.role
          : (initialPersonaFilters.role?.keywords || [])
      });

      setMessageTemplate(initialData.messageTemplate || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

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
    
    return true;
  };

  const handleSubmit = async (saveOnly = false) => {
    if (!validateForm()) return;
    
    if (saveOnly && !searchName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez donner un nom à votre recherche pour la sauvegarder.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const config = {
        name: searchName,
        search_jobs: jobFilters,
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
    <Card className="shadow-lg">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">
              {initialData ? 'Modifier la recherche' : 'Nouvelle recherche d\'emplois'}
            </CardTitle>
            <CardDescription>
              Configurez votre recherche d'offres d'emploi et le ciblage des prospects
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* Nom de la recherche */}
        <div className="space-y-2">
          <Label htmlFor="search-name">Nom de la recherche</Label>
          <Input
            id="search-name"
            placeholder="Ex: Développeurs React Paris"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>

        {/* Filtres de recherche d'emploi */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🔍 Recherche d'emplois
          </h3>
          <JobSearchFilters
            filters={jobFilters}
            onChange={setJobFilters}
          />
        </div>

        {/* Filtres de persona */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🧑‍💼 Ciblage des prospects
          </h3>
          <PersonaFilters
            filters={personaFilters}
            onChange={setPersonaFilters}
          />
        </div>

        {/* Template de message */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            ✍️ Message LinkedIn (optionnel)
          </h3>
          <MessageTemplate
            template={messageTemplate}
            onChange={setMessageTemplate}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
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
