
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageTemplate } from '@/components/search-jobs/MessageTemplate';
import { FileText, Settings, List } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SavedSearch {
  id: string;
  name: string;
  messageTemplate?: string;
}

interface TemplateChoiceStepProps {
  savedSearches: SavedSearch[];
  templateMode: 'unified' | 'individual';
  unifiedTemplate: string;
  individualTemplates: { [searchId: string]: string };
  onTemplateModeChange: (mode: 'unified' | 'individual') => void;
  onUnifiedTemplateChange: (template: string) => void;
  onIndividualTemplateChange: (searchId: string, template: string) => void;
}

export const TemplateChoiceStep = ({
  savedSearches,
  templateMode,
  unifiedTemplate,
  individualTemplates,
  onTemplateModeChange,
  onUnifiedTemplateChange,
  onIndividualTemplateChange
}: TemplateChoiceStepProps) => {
  const [editingSearchId, setEditingSearchId] = useState<string | null>(null);

  const defaultTemplate = `Bonjour {{firstName}},

J'ai vu votre annonce pour le poste de {{jobTitle}} chez {{companyName}}. 

Votre profil correspond parfaitement à ce que nous recherchons pour nos clients. J'aimerais vous présenter une opportunité qui pourrait vous intéresser.

Êtes-vous disponible pour un échange rapide cette semaine ?

Cordialement`;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Configuration des templates de message
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Choisissez comment gérer les templates pour cette prospection volumique
        </p>
      </div>

      {/* Choix du mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mode de template</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={templateMode} onValueChange={onTemplateModeChange}>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="unified" id="unified" />
              <Label htmlFor="unified" className="flex-1 cursor-pointer">
                <div className="font-medium">Template unifié</div>
                <div className="text-sm text-gray-500">
                  Utiliser le même template pour tous les prospects
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="individual" id="individual" />
              <Label htmlFor="individual" className="flex-1 cursor-pointer">
                <div className="font-medium">Templates des job searches</div>
                <div className="text-sm text-gray-500">
                  Utiliser le template spécifique de chaque job search
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Configuration selon le mode choisi */}
      {templateMode === 'unified' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Template unifié
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                Ce template sera utilisé pour tous les prospects, remplaçant les templates individuels des job searches.
              </AlertDescription>
            </Alert>
            <MessageTemplate
              template={unifiedTemplate || defaultTemplate}
              onChange={onUnifiedTemplateChange}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Templates des job searches ({savedSearches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Chaque job search utilisera son template spécifique. Vous pouvez les modifier individuellement.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {savedSearches.map((search) => (
                <div key={search.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{search.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {individualTemplates[search.id] || search.messageTemplate ? 'Configuré' : 'Par défaut'}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSearchId(editingSearchId === search.id ? null : search.id)}
                    >
                      {editingSearchId === search.id ? 'Fermer' : 'Modifier'}
                    </Button>
                  </div>
                  
                  {editingSearchId === search.id && (
                    <div className="mt-3">
                      <MessageTemplate
                        template={individualTemplates[search.id] || search.messageTemplate || defaultTemplate}
                        onChange={(template) => onIndividualTemplateChange(search.id, template)}
                      />
                    </div>
                  )}
                  
                  {editingSearchId !== search.id && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border-l-2 border-gray-300">
                      {(individualTemplates[search.id] || search.messageTemplate || defaultTemplate)
                        .substring(0, 150)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
