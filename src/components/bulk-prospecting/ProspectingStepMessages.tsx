
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, X } from 'lucide-react';
import { JobData, Persona } from '@/types/jobSearch';

interface ProspectingStepMessagesProps {
  jobData: JobData;
  selectedPersonas: Persona[];
  messageTemplate: string;
  personalizedMessages: { [personaId: string]: string };
  onMessagesChange: (messages: { [personaId: string]: string }) => void;
  onPersonaRemoved: (personaId: string) => void;
  getTemplateForPersona?: (persona: Persona) => string;
}

export const ProspectingStepMessages = ({
  jobData,
  selectedPersonas,
  messageTemplate,
  personalizedMessages,
  onMessagesChange,
  onPersonaRemoved,
  getTemplateForPersona
}: ProspectingStepMessagesProps) => {
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
    if (Array.isArray(selectedPersonas) && selectedPersonas.length > 0) {
      const newMessages: { [personaId: string]: string } = {};
      selectedPersonas.forEach((persona) => {
        if (persona && persona.id) {
          // Utiliser le template spécifique au persona si disponible
          const templateToUse = getTemplateForPersona ? 
            getTemplateForPersona(persona) : 
            messageTemplate;
          
          // Utiliser le message existant ou générer un nouveau
          newMessages[persona.id] = personalizedMessages[persona.id] || 
            replaceVariables(templateToUse || messageTemplate, persona);
        }
      });
      onMessagesChange(newMessages);
    }
  }, [messageTemplate, selectedPersonas, getTemplateForPersona]);

  const updateMessage = (personaId: string, message: string) => {
    onMessagesChange({
      ...personalizedMessages,
      [personaId]: message
    });
  };

  const handleRemovePersona = (personaId: string) => {
    // Supprimer le message personnalisé
    const updatedMessages = { ...personalizedMessages };
    delete updatedMessages[personaId];
    onMessagesChange(updatedMessages);
    
    // Supprimer le persona de la sélection
    onPersonaRemoved(personaId);
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

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Personnaliser les messages
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Vérifiez et ajustez chaque message personnalisé avant l'envoi
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">
            {selectedPersonas.length} message(s) à personnaliser
          </Badge>
          <Badge variant="outline">
            {Object.keys(personalizedMessages).filter(id => personalizedMessages[id]?.trim()).length} complété(s)
          </Badge>
        </div>
      </div>

      {/* Scroll infini avec tous les messages */}
      <div className="space-y-6" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' }}>
        {selectedPersonas.map((persona, index) => (
          <Card key={persona.id} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={persona.profile_url} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">
                    {persona.name || 'Nom non disponible'}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {persona.title || 'Titre non disponible'} 
                    {persona.company && ` chez ${persona.company}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemovePersona(persona.id)}
                    className="flex items-center gap-1 hover:bg-red-50 hover:border-red-200 text-red-600 h-8 w-8 p-0"
                    title="Supprimer ce contact"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Label htmlFor={`message-${persona.id}`} className="text-sm font-medium">
                Message personnalisé :
              </Label>
              <Textarea
                id={`message-${persona.id}`}
                value={personalizedMessages[persona.id] || ''}
                onChange={(e) => updateMessage(persona.id, e.target.value)}
                className="resize-none h-32 mt-2"
                placeholder="Le message sera généré automatiquement à partir du template..."
              />
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>
                  {personalizedMessages[persona.id]?.length || 0} caractères
                </span>
                {personalizedMessages[persona.id]?.trim() ? (
                  <Badge variant="secondary" className="text-xs">
                    Prêt
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    À compléter
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Résumé en bas */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Progression : {Object.keys(personalizedMessages).filter(id => personalizedMessages[id]?.trim()).length} / {selectedPersonas.length} messages prêts
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Régénérer tous les messages depuis le template approprié
                  const newMessages: { [personaId: string]: string } = {};
                  selectedPersonas.forEach((persona) => {
                    if (persona && persona.id) {
                      const templateToUse = getTemplateForPersona ? 
                        getTemplateForPersona(persona) : 
                        messageTemplate;
                      newMessages[persona.id] = replaceVariables(templateToUse || messageTemplate, persona);
                    }
                  });
                  onMessagesChange(newMessages);
                }}
              >
                Régénérer tous
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
