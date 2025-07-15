
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, User, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLinkedInConnection } from '@/hooks/useLinkedInConnection';

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
  const { toast } = useToast();
  const { unipileAccountId } = useLinkedInConnection();

  const messagesReady = Object.keys(bulkState.personalizedMessages).length === bulkState.selectedPersonas.length;
  const allMessagesHaveContent = Object.values(bulkState.personalizedMessages).every(msg => msg.trim().length > 0);

  const generateUniqueId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSend = async () => {
    if (!messagesReady || !allMessagesHaveContent) {
      toast({
        title: "Erreur",
        description: "Veuillez compléter tous les messages avant d'envoyer.",
        variant: "destructive",
      });
      return;
    }

    if (!unipileAccountId) {
      toast({
        title: "Erreur",
        description: "Votre compte LinkedIn n'est pas connecté. Veuillez vous connecter avant d'envoyer des messages.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    try {
      // Générer un ID unique pour cette demande d'envoi en masse
      const bulkRequestId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Préparer les données pour l'API N8N avec les LinkedIn IDs
      const messagesToSend = bulkState.selectedPersonas.map(persona => ({
        id: generateUniqueId(), // ID unique pour chaque message
        personaId: persona.id,
        personaName: persona.name,
        personaTitle: persona.title,
        personaCompany: persona.company,
        personaProfileUrl: persona.profileUrl || persona.profile_url,
        // Ajouter le LinkedIn ID du persona
        personaLinkedInId: persona.linkedin_id || persona.id,
        jobTitle: persona.jobTitle,
        jobCompany: persona.jobCompany,
        jobId: persona.jobId,
        message: bulkState.personalizedMessages[persona.id],
        bulkRequestId: bulkRequestId // ID de la demande d'envoi en masse
      }));

      console.log('Envoi vers N8N avec LinkedIn IDs:', { 
        bulkRequestId, 
        messages: messagesToSend, 
        unipileAccountId,
        linkedInIds: messagesToSend.map(msg => msg.personaLinkedInId)
      });

      // URL de l'API N8N pour l'envoi de messages
      const n8nUrl = 'https://n8n.getpro.co/webhook/819ed607-c468-4a53-a98c-817b8f3fc75d';
      
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bulkRequestId: bulkRequestId,
          unipileAccountId: unipileAccountId,
          messages: messagesToSend,
          timestamp: new Date().toISOString(),
          totalMessages: messagesToSend.length
        }),
      });

      if (response.ok) {
        toast({
          title: "Messages envoyés",
          description: `${messagesToSend.length} messages ont été envoyés avec succès vers le système de traitement.`,
        });
        onSend();
      } else {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

    } catch (error) {
      console.error('Erreur lors de l\'envoi vers N8N:', error);
      toast({
        title: "Erreur d'envoi",
        description: "Une erreur est survenue lors de l'envoi des messages. Veuillez réessayer.",
        variant: "destructive",
      });
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
            {unipileAccountId ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span className={unipileAccountId ? 'text-green-600' : 'text-red-600'}>
              Compte LinkedIn connecté: {unipileAccountId ? 'Oui' : 'Non'}
            </span>
          </div>
          
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

        {!unipileAccountId ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              Veuillez connecter votre compte LinkedIn avant de pouvoir envoyer des messages.
            </AlertDescription>
          </Alert>
        ) : !messagesReady || !allMessagesHaveContent ? (
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
          <div className="w-full flex justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl mx-auto">
              {bulkState.selectedPersonas.map((persona) => (
                <div
                  key={persona.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-2 items-start min-h-[140px]"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{persona.name}</p>
                      <p className="text-xs text-gray-600 truncate">{persona.title}</p>
                      {persona.linkedin_id && (
                        <p className="text-xs text-blue-600 truncate">LinkedIn ID: {persona.linkedin_id}</p>
                      )}
                    </div>
                    <Badge variant={bulkState.personalizedMessages[persona.id] ? "secondary" : "outline"} className="text-xs">
                      {bulkState.personalizedMessages[persona.id] ? "Prêt" : "En attente"}
                    </Badge>
                  </div>
                  <div className="w-full mt-2">
                    <div className="text-xs text-gray-700 bg-gray-50 rounded p-2 max-h-16 overflow-hidden whitespace-pre-line" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {bulkState.personalizedMessages[persona.id] || <span className="italic text-gray-400">Aucun message</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions finales */}
        <div className="flex justify-center">
          <Button
            onClick={handleSend}
            disabled={!messagesReady || !allMessagesHaveContent || !unipileAccountId || isSending}
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
