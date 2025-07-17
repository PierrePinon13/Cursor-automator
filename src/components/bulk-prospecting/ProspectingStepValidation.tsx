
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, User, Send, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLinkedInConnection } from '@/hooks/useLinkedInConnection';
import { Progress } from '@/components/ui/progress';

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
  const readyToSend = messagesReady && allMessagesHaveContent && unipileAccountId;

  const generateUniqueId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSend = async () => {
    if (!readyToSend) {
      toast({
        title: "Action impossible",
        description: "Veuillez vérifier que tous les prérequis sont remplis avant d'envoyer.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    try {
      const bulkRequestId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const messagesToSend = bulkState.selectedPersonas.map(persona => ({
        id: generateUniqueId(),
        personaId: persona.id,
        personaName: persona.name,
        personaTitle: persona.title,
        personaCompany: persona.company,
        personaProfileUrl: persona.profileUrl || persona.profile_url,
        personaLinkedInId: persona.linkedin_id || persona.id,
        jobTitle: persona.jobTitle,
        jobCompany: persona.jobCompany,
        jobId: persona.jobId,
        message: bulkState.personalizedMessages[persona.id],
        bulkRequestId: bulkRequestId
      }));

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
          title: "Prospection lancée avec succès",
          description: `${messagesToSend.length} messages ont été envoyés vers le système de traitement.`,
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

  // Calculer le pourcentage de complétion
  const completionPercentage = Math.round(
    (Object.keys(bulkState.personalizedMessages).length / bulkState.selectedPersonas.length) * 100
  );

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <CheckCircle className="h-6 w-6 text-primary" />
          Validation finale
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Résumé de la prospection */}
        <div className="bg-card/50 p-6 rounded-xl border border-border/50">
          <h3 className="font-medium text-lg mb-4">Résumé de votre prospection</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Offre d'emploi</p>
              <p className="font-medium text-lg">{jobData.title}</p>
              <p className="text-sm text-primary">{jobData.company}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Profils sélectionnés</p>
              <div className="flex items-baseline gap-2">
                <p className="font-medium text-2xl">{bulkState.selectedPersonas.length}</p>
                <p className="text-sm text-muted-foreground">contacts</p>
              </div>
              <div className="w-full">
                <Progress value={completionPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {Object.keys(bulkState.personalizedMessages).length} messages personnalisés sur {bulkState.selectedPersonas.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Vérifications */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Prérequis</h3>
          
          <div className="grid gap-3">
            <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${unipileAccountId ? 'bg-green-50' : 'bg-red-50'}`}>
              {unipileAccountId ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${unipileAccountId ? 'text-green-700' : 'text-red-700'}`}>
                Compte LinkedIn {unipileAccountId ? 'connecté' : 'non connecté'}
              </span>
            </div>
            
            <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${messagesReady ? 'bg-green-50' : 'bg-yellow-50'}`}>
              {messagesReady ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              <span className={`font-medium ${messagesReady ? 'text-green-700' : 'text-yellow-700'}`}>
                Messages personnalisés ({Object.keys(bulkState.personalizedMessages).length}/{bulkState.selectedPersonas.length})
              </span>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${allMessagesHaveContent ? 'bg-green-50' : 'bg-yellow-50'}`}>
              {allMessagesHaveContent ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              <span className={`font-medium ${allMessagesHaveContent ? 'text-green-700' : 'text-yellow-700'}`}>
                Contenu des messages validé
              </span>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Aperçu des contacts */}
        <div>
          <h3 className="font-medium text-lg mb-4 flex items-center justify-between">
            <span>Contacts qui recevront un message</span>
            <Badge variant="outline" className="ml-2">
              {bulkState.selectedPersonas.length} contacts
            </Badge>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bulkState.selectedPersonas.map((persona) => (
              <div
                key={persona.id}
                className="bg-card rounded-xl border border-border/50 p-4 flex flex-col gap-2"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{persona.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{persona.title}</p>
                    <p className="text-xs text-primary truncate">{persona.company}</p>
                  </div>
                  <Badge variant={bulkState.personalizedMessages[persona.id] ? "default" : "secondary"} className="shrink-0">
                    {bulkState.personalizedMessages[persona.id] ? "Prêt" : "En attente"}
                  </Badge>
                </div>
                {bulkState.personalizedMessages[persona.id] && (
                  <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 max-h-16 overflow-hidden">
                    <p className="line-clamp-3">{bulkState.personalizedMessages[persona.id]}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bouton d'action */}
        <div className="sticky bottom-0 left-0 right-0 mt-8 flex justify-end">
          <Button
            size="lg"
            onClick={handleSend}
            disabled={!readyToSend || isSending}
            className={`${readyToSend ? 'bg-primary hover:bg-primary/90' : 'bg-muted'} transition-all duration-200`}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Lancer la prospection
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
