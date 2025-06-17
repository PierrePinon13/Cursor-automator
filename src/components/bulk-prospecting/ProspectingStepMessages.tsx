import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface JobData {
  id: string;
  title: string;
  company: string;
  personas: any[];
}

interface ProspectingStepMessagesProps {
  jobData: JobData;
  selectedPersonas: any[];
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
  const replaceVariables = (template: string, persona: any) => {
    const firstName = persona.name?.split(' ')[0] || persona.name || 'Contact';
    const lastName = persona.name?.split(' ').slice(1).join(' ') || '';
    
    return template
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{lastName\}\}/g, lastName)
      .replace(/\{\{jobTitle\}\}/g, persona.jobTitle || jobData.title)
      .replace(/\{\{companyName\}\}/g, persona.jobCompany || jobData.company)
      .replace(/\{\{personaTitle\}\}/g, persona.title || 'Contact')
      .replace(/\{\{personaCompany\}\}/g, persona.company || 'Entreprise');
  };

  // Générer automatiquement les messages personnalisés
  useEffect(() => {
    if (messageTemplate && selectedPersonas.length > 0) {
      const newMessages: { [personaId: string]: string } = {};
      selectedPersonas.forEach((persona) => {
        if (!personalizedMessages[persona.id]) {
          newMessages[persona.id] = replaceVariables(messageTemplate, persona);
        } else {
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

  const currentPersona = selectedPersonas[selectedPersonaIndex];

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
            <AvatarImage src={currentPersona?.profileUrl} />
            <AvatarFallback>{currentPersona?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <Label>{currentPersona?.name}</Label>
            <p className="text-sm text-gray-500">{currentPersona?.title} chez {currentPersona?.company}</p>
          </div>
        </div>

        <Label htmlFor="message">Message personnalisé :</Label>
        <Textarea
          id="message"
          value={personalizedMessages[currentPersona?.id] || ''}
          onChange={(e) => updateMessage(currentPersona?.id, e.target.value)}
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
