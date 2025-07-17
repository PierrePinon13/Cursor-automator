
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
  setUntreatedCount?: (count: number) => void;
}

export const ProspectingStepMessages = ({
  jobData,
  selectedPersonas,
  messageTemplate,
  personalizedMessages,
  onMessagesChange,
  onPersonaRemoved,
  getTemplateForPersona,
  variableReplacements = {},
  setUntreatedCount
}: ProspectingStepMessagesProps) => {
  const [validatedIds, setValidatedIds] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  // Liste des messages à afficher : validés + non traités (sans doublons)
  const validatedPersonas = selectedPersonas.filter(p => validatedIds.includes(p.id));
  const untreatedPersonas = selectedPersonas.filter(p => !validatedIds.includes(p.id) && !removedIds.includes(p.id));
  const displayedPersonas = [...validatedPersonas, ...untreatedPersonas];
  const untreatedCount = selectedPersonas.filter(p => !validatedIds.includes(p.id) && !removedIds.includes(p.id)).length;

  useEffect(() => {
    if (setUntreatedCount) setUntreatedCount(untreatedCount);
  }, [untreatedCount, setUntreatedCount]);

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

  const handleValidate = (personaId: string) => {
    setValidatedIds(ids => [...ids, personaId]);
  };
  const handleRemove = (personaId: string) => {
    setRemovedIds(ids => [...ids, personaId]);
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
            {displayedPersonas.length} message(s) à traiter
          </Badge>
          <Badge variant="outline">
            {validatedIds.length} validé(s)
          </Badge>
        </div>
      </div>

      {/* Scroll infini avec tous les messages */}
      <div className="flex flex-col items-center gap-4" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' }}>
        {displayedPersonas.map((persona, index) => {
          const templateToUse = getTemplateForPersona ? getTemplateForPersona(persona) : messageTemplate;
          const initialMessage = replaceVariables(templateToUse || messageTemplate, persona);
          const currentMessage = personalizedMessages[persona.id] || '';
          const isModified = currentMessage.trim() && currentMessage.trim() !== initialMessage.trim();
          const isValidated = validatedIds.includes(persona.id);
          return (
            <Card
              key={persona.id}
              className={`relative border-l-4 ${isValidated ? 'border-l-green-500 ring-2 ring-green-300' : 'border-l-blue-500'} group transition-shadow pb-12 max-w-xl w-full mx-auto shadow-sm mb-2`}
              style={{ marginBottom: 0, padding: 0 }}
            >
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={persona.profile_url} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {persona.name || 'Nom non disponible'}
                    </h4>
                    <p className="text-xs text-green-700 font-semibold mb-0.5 truncate">
                      {persona.jobTitle || jobData?.title || 'Titre non disponible'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {persona.title || 'Titre non disponible'}
                      {persona.company && ` chez ${persona.company}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    {isValidated && (
                      <Badge variant="secondary" className="text-xs bg-green-200 text-green-900 border-green-300">Validé</Badge>
                    )}
                    {isModified && !isValidated && (
                      <Badge variant="secondary" className="text-xs bg-yellow-200 text-yellow-900 border-yellow-300">Modifié</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-2 px-4">
                <div className="relative group mt-1">
                  <textarea
                    id={`message-${persona.id}`}
                    value={currentMessage}
                    onChange={(e) => updateMessage(persona.id, e.target.value)}
                    className={`w-full mt-1 pr-10 rounded-md border border-gray-200 bg-white p-2 text-[15px] font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 shadow-xs transition-all duration-150 ${isValidated ? 'bg-green-50' : ''}`}
                    placeholder="Le message sera généré automatiquement à partir du template..."
                    rows={3}
                    style={{ minHeight: '80px', maxHeight: '200px', overflow: 'hidden', resize: 'vertical' }}
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
                    disabled={isValidated}
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
                    disabled={isValidated}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6.75A2.25 2.25 0 0014.25 4.5h-6A2.25 2.25 0 006 6.75v10.5A2.25 2.25 0 008.25 19.5h6a2.25 2.25 0 002.25-2.25v-1.5M9.75 15.75h6a2.25 2.25 0 002.25-2.25v-6A2.25 2.25 0 0015.75 5.25h-6A2.25 2.25 0 007.5 7.5v6a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </Button>
                </div>
                <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
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
                <div className="absolute bottom-2 left-0 w-full flex justify-center gap-4 z-10">
                  {!isValidated && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full border-2 border-blue-500 bg-white shadow h-10 w-10 flex items-center justify-center"
                      onClick={() => handleValidate(persona.id)}
                      title="Valider ce message"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 text-blue-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full border-2 border-gray-300 bg-white shadow h-10 w-10 flex items-center justify-center"
                    onClick={() => handleRemove(persona.id)}
                    title="Supprimer ce message"
                    disabled={isValidated}
                  >
                    <X className="h-6 w-6 text-gray-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Si des messages non traités, bouton Valider tout */}
      {untreatedCount > 0 && (
        <div className="flex justify-center mt-4">
              <Button
            className="bg-green-600 hover:bg-green-700 px-8"
                onClick={() => {
              const untreatedIds = selectedPersonas.filter(p => !validatedIds.includes(p.id) && !removedIds.includes(p.id)).map(p => p.id);
              setValidatedIds(ids => [...ids, ...untreatedIds]);
            }}
          >
            Valider tous les messages restants
              </Button>
            </div>
      )}
    </div>
  );
};
