
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Persona {
  id: string;
  name: string;
  title: string;
  profileUrl: string;
  company?: string;
}

interface MessagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  jobTitle: string;
  companyName: string;
  initialTemplate?: string;
}

interface MessageStatus {
  personaId: string;
  status: 'pending' | 'sending' | 'sent' | 'error';
  error?: string;
}

export const MessagePreviewModal = ({ 
  isOpen, 
  onClose, 
  personas, 
  jobTitle, 
  companyName,
  initialTemplate = ''
}: MessagePreviewModalProps) => {
  const [customTemplate, setCustomTemplate] = useState(initialTemplate);
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();

  // Fonction pour remplacer les variables dans le template
  const replaceVariables = (template: string, persona: Persona) => {
    const firstName = persona.name.split(' ')[0] || persona.name;
    return template
      .replace(/\{\{\s*firstName\s*\}\}/g, firstName)
      .replace(/\{\{\s*jobTitle\s*\}\}/g, jobTitle)
      .replace(/\{\{\s*companyName\s*\}\}/g, companyName);
  };

  // Générer les prévisualisations des messages
  const messagePreviews = useMemo(() => {
    return personas.map(persona => ({
      persona,
      preview: customTemplate ? replaceVariables(customTemplate, persona) : `Bonjour ${persona.name.split(' ')[0]},\n\nJ'ai vu que ${companyName} recrute un ${jobTitle}.\n\nJe connais bien ces recherches, je peux vous présenter des candidats si cela peut vous faire gagner du temps.\n\nBonne journée`
    }));
  }, [personas, customTemplate, jobTitle, companyName]);

  // Initialiser les statuts des messages
  useState(() => {
    setMessageStatuses(personas.map(p => ({ personaId: p.id, status: 'pending' })));
  });

  const sendMessageToPersona = async (persona: Persona, message: string): Promise<boolean> => {
    if (!user) {
      console.error('❌ No user found for message sending');
      return false;
    }

    try {
      console.log('🚀 Sending message to persona:', persona.name);
      
      // Créer ou trouver un lead temporaire pour ce persona
      let leadId = persona.id;
      
      // Vérifier si un lead existe déjà pour ce profil
      const { data: existingLead, error: leadError } = await supabase
        .from('leads')
        .select('id')
        .eq('author_profile_url', persona.profileUrl)
        .maybeSingle();

      if (leadError) {
        console.error('❌ Error checking existing lead:', leadError);
      }

      if (existingLead) {
        leadId = existingLead.id;
        console.log('✅ Using existing lead:', leadId);
      } else {
        // Créer un lead temporaire pour ce persona
        const { data: newLead, error: createError } = await supabase
          .from('leads')
          .insert({
            author_name: persona.name,
            author_profile_url: persona.profileUrl,
            author_headline: persona.title,
            company_name: persona.company || companyName,
            post_content: `Contact from job search: ${jobTitle} at ${companyName}`,
            created_at: new Date().toISOString(),
            processed_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createError) {
          console.error('❌ Error creating lead:', createError);
          throw new Error(`Failed to create lead: ${createError.message}`);
        }

        leadId = newLead.id;
        console.log('✅ Created new lead:', leadId);
      }

      // Appeler la fonction edge linkedin-message
      const { data, error } = await supabase.functions.invoke('linkedin-message', {
        body: { 
          leadId: leadId,
          message: message.trim(),
          userId: user.id,
          userFullName: user.user_metadata?.full_name || 'Utilisateur Inconnu'
        }
      });

      console.log('📡 LinkedIn message response:', { data, error });

      if (error) {
        console.error('❌ Function error:', error);
        throw error;
      }

      if (data && data.success) {
        console.log('✅ Message sent successfully to:', persona.name);
        return true;
      } else {
        const errorMessage = data?.error || 'Échec de l\'envoi du message';
        console.error('❌ Message sending failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('💥 Error sending message to persona:', persona.name, error);
      throw error;
    }
  };

  const handleSendMessages = async () => {
    if (!customTemplate.trim() && !initialTemplate) {
      toast({
        title: "Message requis",
        description: "Veuillez saisir un message à envoyer.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    
    // Réinitialiser les statuts
    setMessageStatuses(personas.map(p => ({ personaId: p.id, status: 'pending' })));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < personas.length; i++) {
      const persona = personas[i];
      const message = messagePreviews[i].preview;

      // Mettre à jour le statut à "sending"
      setMessageStatuses(prev => prev.map(status => 
        status.personaId === persona.id 
          ? { ...status, status: 'sending' }
          : status
      ));

      try {
        const success = await sendMessageToPersona(persona, message);

        // Mettre à jour le statut selon le résultat
        setMessageStatuses(prev => prev.map(status => 
          status.personaId === persona.id 
            ? { ...status, status: success ? 'sent' : 'error', error: success ? undefined : 'Échec de l\'envoi' }
            : status
        ));

        if (success) {
          successCount++;
          toast({
            title: "Message envoyé",
            description: `Message envoyé avec succès à ${persona.name}`,
          });
        } else {
          errorCount++;
        }

        // Délai entre les messages (3-5 secondes) pour éviter le rate limiting
        if (i < personas.length - 1) {
          const delay = Math.random() * 2000 + 3000; // 3-5 secondes
          console.log(`⏳ Attente de ${Math.round(delay)}ms avant le prochain message...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error: any) {
        console.error('💥 Error sending message to:', persona.name, error);
        errorCount++;
        setMessageStatuses(prev => prev.map(status => 
          status.personaId === persona.id 
            ? { ...status, status: 'error', error: error.message || 'Erreur lors de l\'envoi' }
            : status
        ));

        toast({
          title: "Erreur d'envoi",
          description: `Échec de l'envoi à ${persona.name}: ${error.message}`,
          variant: "destructive"
        });
      }
    }

    setIsSending(false);
    
    // Message de résumé final
    if (successCount > 0) {
      toast({
        title: "Envoi terminé",
        description: `${successCount}/${personas.length} messages envoyés avec succès.`,
      });
    }

    if (errorCount === personas.length) {
      toast({
        title: "Échec total",
        description: "Aucun message n'a pu être envoyé. Vérifiez votre connexion LinkedIn.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-gray-400" />;
      case 'sending': return <MessageSquare className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Envoi de messages LinkedIn - {jobTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Template de message */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Template de message</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Bonjour {{ firstName }}, j'ai vu que {{ companyName }} recrute un {{ jobTitle }}..."
                    value={customTemplate}
                    onChange={(e) => setCustomTemplate(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Variables disponibles :</strong></p>
                    <p><code className="bg-gray-100 px-1 rounded">{'{{ firstName }}'}</code> - Prénom du contact</p>
                    <p><code className="bg-gray-100 px-1 rounded">{'{{ jobTitle }}'}</code> - {jobTitle}</p>
                    <p><code className="bg-gray-100 px-1 rounded">{'{{ companyName }}'}</code> - {companyName}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Statuts d'envoi */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Statut d'envoi ({personas.length} contacts)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {personas.map((persona) => {
                      const status = messageStatuses.find(s => s.personaId === persona.id);
                      return (
                        <div key={persona.id} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">{persona.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(status?.status || 'pending')}
                            <Badge variant={status?.status === 'sent' ? 'default' : status?.status === 'error' ? 'destructive' : 'secondary'}>
                              {status?.status === 'pending' && 'En attente'}
                              {status?.status === 'sending' && 'Envoi...'}
                              {status?.status === 'sent' && 'Envoyé'}
                              {status?.status === 'error' && 'Erreur'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Prévisualisations */}
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Prévisualisations des messages</CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {messagePreviews.map((preview, index) => (
                        <Card key={preview.persona.id} className="border-l-4 border-l-blue-500">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{preview.persona.name}</p>
                                <p className="text-xs text-gray-500">{preview.persona.title}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                Message {index + 1}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap border">
                              {preview.preview}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {personas.length} contact(s) sélectionné(s)
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Fermer
            </Button>
            
            <Button
              onClick={handleSendMessages}
              disabled={isSending || personas.length === 0}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSending ? 'Envoi en cours...' : `Envoyer ${personas.length} message(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
