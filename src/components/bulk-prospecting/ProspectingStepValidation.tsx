
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, User, MessageSquare, Send } from 'lucide-react';

interface JobData {
  id: string;
  title: string;
  company: string;
  personas: any[];
}

interface BulkProspectingState {
  selectedPersonas: any[];
  messageTemplate: string;
  personalizedMessages: { [personaId: string]: string };
}

interface ProspectingStepValidationProps {
  jobData: JobData;
  bulkState: BulkProspectingState;
  onSend: () => void;
}

export const ProspectingStepValidation = ({ 
  jobData,
  bulkState,
  onSend
}: ProspectingStepValidationProps) => {
  const [isSending, setIsSending] = useState(false);

  const messagesReady = Object.keys(bulkState.personalizedMessages).length === bulkState.selectedPersonas.length;
  const allMessagesHaveContent = Object.values(bulkState.personalizedMessages).every(msg => msg.trim().length > 0);

  const handleSend = async () => {
    setIsSending(true);
    try {
      // Ici, vous ajouteriez la logique d'envoi réelle
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulation
      onSend();
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Validation finale
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Résumé de la prospection */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3">Résumé de votre prospection</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Offre d'emploi</p>
              <p className="font-medium">{jobData.title}</p>
              <p className="text-sm text-gray-600">{jobData.company}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Profils sélectionnés</p>
              <p className="font-medium">{bulkState.selectedPersonas.length} contact(s)</p>
            </div>
          </div>
        </div>

        {/* Vérifications */}
        <div className="space-y-3">
          <h3 className="font-medium">Vérifications</h3>
          
          <div className="flex items-center gap-3">
            {messagesReady ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            <span className={messagesReady ? 'text-green-600' : 'text-yellow-600'}>
              Messages personnalisés: {Object.keys(bulkState.personalizedMessages).length}/{bulkState.selectedPersonas.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {allMessagesHaveContent ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            <span className={allMessagesHaveContent ? 'text-green-600' : 'text-yellow-600'}>
              Tous les messages ont du contenu
            </span>
          </div>
        </div>

        {!messagesReady || !allMessagesHaveContent ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Veuillez compléter tous les messages avant de pouvoir envoyer la prospection.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-700">
              Votre prospection est prête à être envoyée !
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Aperçu des contacts */}
        <div>
          <h3 className="font-medium mb-3">Contacts qui recevront un message</h3>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {bulkState.selectedPersonas.map((persona) => (
              <div key={persona.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-3 w-3 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{persona.name}</p>
                  <p className="text-xs text-gray-600">{persona.title}</p>
                </div>
                <Badge variant={bulkState.personalizedMessages[persona.id] ? "secondary" : "outline"} className="text-xs">
                  {bulkState.personalizedMessages[persona.id] ? "Prêt" : "En attente"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Actions finales */}
        <div className="flex justify-center">
          <Button
            onClick={handleSend}
            disabled={!messagesReady || !allMessagesHaveContent || isSending}
            className="bg-green-600 hover:bg-green-700 px-8"
            size="lg"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer {bulkState.selectedPersonas.length} message(s)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
