
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { JobData, Persona } from '@/types/jobSearch';

interface ProspectingStepMessagesProps {
  jobData: JobData;
  selectedPersonas: Persona[];
  messageTemplate: string;
  personalizedMessages: { [personaId: string]: string };
  onMessagesChange: (messages: { [personaId: string]: string }) => void;
}

export const ProspectingStepMessages = ({
  jobData,
  selectedPersonas,
  messageTemplate,
  personalizedMessages,
  onMessagesChange
}: ProspectingStepMessagesProps) => {
  const [selectedPersonaIndex, setSelectedPersonaIndex] = useState(0);

  // Fonction pour remplacer les variables avec les vraies données
  const replaceVariables = (template: string, persona: Persona) => {
    if (!template || typeof template !== 'string') {
      return 'Template invalide';
    }

    const firstName = persona.name?.split(' ')[0] || persona.name || 'Contact';
    const lastName = persona.name?.split(' ').slice(1).join(' ') || '';
    
    return template
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{lastName\}\}/g, lastName)
      .replace(/\{\{jobTitle\}\}/g, persona.jobTitle || jobData?.title || 'Poste')
      .replace(/\{\{companyName\}\}/g, persona.jobCompany || jobData?.company || 'Entreprise')
      .replace(/\{\{personaTitle\}\}/g, persona.title || 'Contact')
      .replace(/\{\{personaCompany\}\}/g, persona.company || 'Entreprise');
  };

  // Générer automatiquement les messages personnalisés
  useEffect(() => {
    if (messageTemplate && Array.isArray(selectedPersonas) && selectedPersonas.length > 0) {
      const newMessages: { [personaId: string]: string } = {};
      selectedPersonas.forEach((persona) => {
        if (persona && persona.id && !personalizedMessages[persona.id]) {
          newMessages[persona.id] = replaceVariables(messageTemplate, persona);
        } else if (persona && persona.id) {
          newMessages[persona.id] = personalizedMessages[persona.id];
        }
      });
      onMessagesChange(newMessages);
    }
  }, [messageTemplate, selectedPersonas]);

  const updateMessage = (personaId: string, message: string) => {
    onMessagesChange({
      ...personalizedMessages,
      [personaId]: message
    });
  };

  if (!Array.isArray(selectedPersonas) || selectedPersonas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Aucun persona sélectionné</p>
        </CardContent>
      </Card>
    );
  }

  const currentPersona = selectedPersonas[selectedPersonaIndex];

  if (!currentPersona) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Persona non trouvé</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Personnaliser les messages ({selectedPersonaIndex + 1}/{selectedPersonas.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={currentPersona.profile_url} />
            <AvatarFallback>{currentPersona.name?.charAt(0) || 'C'}</AvatarFallback>
          </Avatar>
          <div>
            <Label>{currentPersona.name || 'Nom non disponible'}</Label>
            <p className="text-sm text-gray-500">
              {currentPersona.title || 'Titre non disponible'} chez {currentPersona.company || 'Entreprise non disponible'}
            </p>
          </div>
        </div>

        <Label htmlFor="message">Message personnalisé :</Label>
        <Textarea
          id="message"
          value={personalizedMessages[currentPersona.id] || ''}
          onChange={(e) => updateMessage(currentPersona.id, e.target.value)}
          className="resize-none h-48"
        />

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setSelectedPersonaIndex(selectedPersonaIndex - 1)}
            disabled={selectedPersonaIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedPersonaIndex(selectedPersonaIndex + 1)}
            disabled={selectedPersonaIndex === selectedPersonas.length - 1}
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
