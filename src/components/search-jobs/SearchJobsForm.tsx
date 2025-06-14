
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { JobSearchFilters } from './JobSearchFilters';
import { PersonaFilters } from './PersonaFilters';
import { MessageTemplate } from './MessageTemplate';
import { Search, Target, MessageSquare, Save, Play } from 'lucide-react';

interface SearchJobsFormProps {
  onSubmit: (config: any) => Promise<any>;
  onCancel: () => void;
  initialData?: any;
}

export const SearchJobsForm = ({ onSubmit, onCancel, initialData }: SearchJobsFormProps) => {
  const [searchName, setSearchName] = useState(initialData?.name || '');
  const [jobFilters, setJobFilters] = useState(initialData?.jobFilters || {
    keywords: '',
    location: [],
    date_posted: 'any',
    sort_by: 'date'
  });
  const [personaFilters, setPersonaFilters] = useState(initialData?.personaFilters || {
    keywords: '',
    role: [],
    profile_language: 'fr'
  });
  const [messageTemplate, setMessageTemplate] = useState(initialData?.messageTemplate || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (saveOnly = false) => {
    setIsSubmitting(true);
    try {
      const config = {
        name: searchName,
        search_jobs: jobFilters,
        personna_filters: personaFilters,
        message_template: messageTemplate,
        saveOnly
      };
      
      await onSubmit(config);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Configuration de la recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="searchName">Nom de la recherche</Label>
            <Input
              id="searchName"
              placeholder="Ex: Développeurs React Paris"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filtres de recherche d'emploi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            1. Recherche d'emploi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <JobSearchFilters
            filters={jobFilters}
            onChange={setJobFilters}
          />
        </CardContent>
      </Card>

      {/* Filtres de personas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            2. Ciblage des personas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PersonaFilters
            filters={personaFilters}
            onChange={setPersonaFilters}
          />
        </CardContent>
      </Card>

      {/* Template de message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            3. Message LinkedIn (optionnel)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MessageTemplate
            template={messageTemplate}
            onChange={setMessageTemplate}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || !searchName}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Sauvegarder
          </Button>
          
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !searchName || !jobFilters.keywords}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isSubmitting ? 'Lancement...' : 'Lancer la recherche'}
          </Button>
        </div>
      </div>
    </div>
  );
};
