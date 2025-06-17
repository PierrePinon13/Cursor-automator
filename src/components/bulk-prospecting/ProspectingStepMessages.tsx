
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { User, Search, MessageSquare, RefreshCw } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    selectedPersonas.length > 0 ? selectedPersonas[0].id : null
  );

  const filteredPersonas = selectedPersonas.filter(persona =>
    !searchTerm || 
    persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    persona.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generatePersonalizedMessage = (persona: any) => {
    const firstName = persona.name.split(' ')[0];
    const lastName = persona.name.split(' ').slice(1).join(' ');
    
    return messageTemplate
      .replace(/\[PRENOM\]/g, firstName)
      .replace(/\[NOM\]/g, lastName)
      .replace(/\[POSTE\]/g, jobData.title)
      .replace(/\[ENTREPRISE\]/g, jobData.company);
  };

  const generateAllMessages = () => {
    const newMessages: { [personaId: string]: string } = {};
    selectedPersonas.forEach(persona => {
      newMessages[persona.id] = generatePersonalizedMessage(persona);
    });
    onMessagesChange(newMessages);
  };

  const updateMessage = (personaId: string, message: string) => {
    onMessagesChange({
      ...personalizedMessages,
      [personaId]: message
    });
  };

  const selectedPersona = selectedPersonas.find(p => p.id === selectedPersonaId);

  // Générer automatiquement les messages manquants
  if (Object.keys(personalizedMessages).length === 0 && selectedPersonas.length > 0) {
    generateAllMessages();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Liste des personnes */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profils sélectionnés
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {filteredPersonas.map((persona) => {
              const hasMessage = personalizedMessages[persona.id];
              const isSelected = selectedPersonaId === persona.id;
              
              return (
                <div
                  key={persona.id}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedPersonaId(persona.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="h-3 w-3 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-gray-900 truncate">
                          {persona.name}
                        </h4>
                        {hasMessage && (
                          <Badge variant="secondary" className="text-xs">
                            ✓
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {persona.title}
                      </p>
                      {persona.company && (
                        <p className="text-xs text-gray-500 truncate">
                          {persona.company}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Éditeur de message */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              {selectedPersona ? `Message pour ${selectedPersona.name}` : 'Sélectionnez un profil'}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateAllMessages}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Régénérer tous
              </Button>
            </div>
          </div>
          
          {selectedPersona && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {selectedPersona.title}
              </Badge>
              {selectedPersona.company && (
                <Badge variant="outline" className="text-xs">
                  {selectedPersona.company}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {selectedPersona ? (
            <div className="space-y-4">
              <Textarea
                placeholder="Votre message personnalisé..."
                value={personalizedMessages[selectedPersona.id] || ''}
                onChange={(e) => updateMessage(selectedPersona.id, e.target.value)}
                className="min-h-[200px] resize-none"
              />
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>
                  {personalizedMessages[selectedPersona.id]?.length || 0} caractères
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateMessage(selectedPersona.id, generatePersonalizedMessage(selectedPersona))}
                >
                  Utiliser le template
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Sélectionnez un profil pour éditer son message</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
