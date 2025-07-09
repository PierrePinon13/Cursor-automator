
import { useState, useEffect, useRef } from 'react';
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
  variableReplacements?: any;
}

export const ProspectingStepMessages = ({
  jobData,
  selectedPersonas,
  messageTemplate,
  personalizedMessages,
  onMessagesChange,
  onPersonaRemoved,
  getTemplateForPersona,
  variableReplacements = {}
}: ProspectingStepMessagesProps) => {
  // Fonction pour remplacer les variables avec les vraies données
  const replaceVariables = (template: string, persona: Persona) => {
    if (!template || typeof template !== 'string') {
      return 'Template invalide';
    }

    let firstName = persona.name?.split(' ')[0] || persona.name || 'Contact';
    let lastName = persona.name?.split(' ').slice(1).join(' ') || '';
    let jobTitle = persona.jobTitle || jobData?.title || 'Poste';
    let companyName = persona.jobCompany || jobData?.company || 'Entreprise';
    let personaTitle = persona.title || 'Contact';
    let personaCompany = persona.company || 'Entreprise';

    // Appliquer les remplacements personnalisés si présents
    if (variableReplacements.jobTitle && variableReplacements.jobTitle[jobTitle]) {
      jobTitle = variableReplacements.jobTitle[jobTitle];
    }
    if (variableReplacements.companyName && variableReplacements.companyName[companyName]) {
      companyName = variableReplacements.companyName[companyName];
    }
    if (variableReplacements.firstName && variableReplacements.firstName[firstName]) {
      firstName = variableReplacements.firstName[firstName];
    }
    if (variableReplacements.lastName && variableReplacements.lastName[lastName]) {
      lastName = variableReplacements.lastName[lastName];
    }
    if (variableReplacements.personaTitle && variableReplacements.personaTitle[personaTitle]) {
      personaTitle = variableReplacements.personaTitle[personaTitle];
    }
    if (variableReplacements.personaCompany && variableReplacements.personaCompany[personaCompany]) {
      personaCompany = variableReplacements.personaCompany[personaCompany];
    }

    return template
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{lastName\}\}/g, lastName)
      .replace(/\{\{jobTitle\}\}/g, jobTitle)
      .replace(/\{\{companyName\}\}/g, companyName)
      .replace(/\{\{personaTitle\}\}/g, personaTitle)
      .replace(/\{\{personaCompany\}\}/g, personaCompany);
  };

  // Générer automatiquement les messages personnalisés SEULEMENT pour les nouveaux personas
  useEffect(() => {
    if (Array.isArray(selectedPersonas) && selectedPersonas.length > 0) {
      const newMessages: { [personaId: string]: string } = { ...personalizedMessages };
      let hasNewMessages = false;
      
      selectedPersonas.forEach((persona) => {
        if (persona && persona.id) {
          // Générer le message SEULEMENT si il n'existe pas déjà
          if (!newMessages[persona.id]) {
            const templateToUse = getTemplateForPersona ? 
              getTemplateForPersona(persona) : 
              messageTemplate;
            
            newMessages[persona.id] = replaceVariables(templateToUse || messageTemplate, persona);
            hasNewMessages = true;
          }
        }
      });
      
      // Supprimer les messages des personas qui ne sont plus sélectionnés
      const currentPersonaIds = selectedPersonas.map(p => p.id);
      Object.keys(personalizedMessages).forEach(personaId => {
        if (!currentPersonaIds.includes(personaId)) {
          delete newMessages[personaId];
          hasNewMessages = true;
        }
      });
      
      // Ne mettre à jour que si on a des changements
      if (hasNewMessages) {
        onMessagesChange(newMessages);
      }
    }
  }, [selectedPersonas.map(p => p.id).join(',')]); // Dépendance plus précise

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
        {selectedPersonas.map((persona, index) => {
          const templateToUse = getTemplateForPersona ? getTemplateForPersona(persona) : messageTemplate;
          const initialMessage = replaceVariables(templateToUse || messageTemplate, persona);
          const currentMessage = personalizedMessages[persona.id] || '';
          const isModified = currentMessage.trim() && currentMessage.trim() !== initialMessage.trim();
          return (
            <Card key={`${persona.id}-${index}`} className={`relative border-l-4 border-l-blue-500 group transition-shadow pb-20 ${isModified ? 'ring-2 ring-yellow-300' : ''}`}>
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
                    {/* Titre du poste recherché juste sous le nom */}
                    <p className="text-xs text-green-700 font-semibold mb-1">
                      {persona.jobTitle || jobData?.title || 'Titre non disponible'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {persona.title || 'Titre non disponible'}
                      {persona.company && ` chez ${persona.company}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    {isModified && (
                      <Badge variant="secondary" className="text-xs bg-yellow-200 text-yellow-900 border-yellow-300">Modifié</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Label htmlFor={`message-${persona.id}`} className="text-sm font-medium">
                  Message personnalisé :
                </Label>
                <div className="relative group">
                  <textarea
                    id={`message-${persona.id}`}
                    value={currentMessage}
                    onChange={(e) => updateMessage(persona.id, e.target.value)}
                    className={`w-full mt-2 pr-12 rounded-lg border border-gray-200 bg-white p-4 text-base font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 shadow-sm transition-all duration-150 ${isModified ? 'bg-yellow-50' : ''}`}
                    placeholder="Le message sera généré automatiquement à partir du template..."
                    rows={1}
                    style={{ minHeight: '56px', maxHeight: 'none', overflow: 'hidden', resize: 'none' }}
                    ref={el => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                      }
                    }}
                    onInput={e => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 text-gray-400 hover:text-blue-700"
                    title="Copier le message"
                    onClick={() => {
                      navigator.clipboard.writeText(currentMessage);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6.75A2.25 2.25 0 0014.25 4.5h-6A2.25 2.25 0 006 6.75v10.5A2.25 2.25 0 008.25 19.5h6a2.25 2.25 0 002.25-2.25v-1.5M9.75 15.75h6a2.25 2.25 0 002.25-2.25v-6A2.25 2.25 0 0015.75 5.25h-6A2.25 2.25 0 007.5 7.5v6a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </Button>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>
                    {currentMessage.length || 0} caractères
                  </span>
                  {currentMessage.trim() ? (
                    <Badge variant="secondary" className="text-xs">
                      Prêt
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      À compléter
                    </Badge>
                  )}
                </div>
                {/* Boutons croix/tick tout en bas de la carte */}
                <div className="absolute bottom-4 left-0 w-full flex justify-center gap-6 z-10">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full border-2 border-gray-300 bg-white shadow-md h-14 w-14 flex items-center justify-center"
                    onClick={() => handleRemovePersona(persona.id)}
                    title="Supprimer ce contact"
                  >
                    <X className="h-7 w-7 text-gray-400" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full border-2 border-blue-500 bg-white shadow-md h-14 w-14 flex items-center justify-center"
                    onClick={() => {/* Action de validation à définir ici */}}
                    title="Valider ce contact"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-7 w-7 text-blue-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
