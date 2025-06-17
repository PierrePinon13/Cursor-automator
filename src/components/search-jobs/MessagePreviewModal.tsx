import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, User, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Persona {
  id: string;
  name: string;
  title: string;
  profileUrl: string;
  company?: string;
  linkedin_id?: string;
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

interface MessagePreview {
  persona: Persona;
  preview: string;
  characterCount: number;
  isOverLimit: boolean;
  lastContactInfo?: {
    lastContactAt: string;
    contactedBy: string;
    hoursAgo: number;
    daysAgo: number;
  };
}

const MAX_MESSAGE_LENGTH = 300;

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
  const [lastContactChecks, setLastContactChecks] = useState<Record<string, any>>({});
  const { user } = useAuth();

  // Fonction pour remplacer les variables dans le template
  const replaceVariables = (template: string, persona: Persona) => {
    const firstName = persona.name.split(' ')[0] || persona.name;
    return template
      .replace(/\{\{\s*firstName\s*\}\}/g, firstName)
      .replace(/\{\{\s*jobTitle\s*\}\}/g, jobTitle)
      .replace(/\{\{\s*companyName\s*\}\}/g, companyName);
  };

  // Vérifier les derniers contacts
  const checkLastContacts = async () => {
    const checks: Record<string, any> = {};
    
    for (const persona of personas) {
      try {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id, last_contact_at, contacted_by_user_name')
          .eq('author_profile_url', persona.profileUrl)
          .eq('lead_source', 'job_search')
          .maybeSingle();

        if (existingLead?.last_contact_at) {
          const lastContactDate = new Date(existingLead.last_contact_at);
          const now = new Date();
          const hoursAgo = (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60);
          const daysAgo = hoursAgo / 24;

          if (daysAgo <= 7) {
            checks[persona.id] = {
              lastContactAt: existingLead.last_contact_at,
              contactedBy: existingLead.contacted_by_user_name || 'Utilisateur inconnu',
              hoursAgo: Math.round(hoursAgo * 10) / 10,
              daysAgo: Math.round(daysAgo * 10) / 10
            };
          }
        }
      } catch (error) {
        console.error('Error checking last contact for:', persona.name, error);
      }
    }
    
    setLastContactChecks(checks);
  };

  // Générer les prévisualisations des messages avec compteur de caractères
  const messagePreviews: MessagePreview[] = useMemo(() => {
    return personas.map(persona => {
      const preview = customTemplate 
        ? replaceVariables(customTemplate, persona) 
        : `Bonjour ${persona.name.split(' ')[0]},\n\nJ'ai vu que ${companyName} recrute un ${jobTitle}.\n\nJe connais bien ces recherches, je peux vous présenter des candidats si cela peut vous faire gagner du temps.\n\nBonne journée`;
      
      const characterCount = preview.length;
      const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
      const lastContactInfo = lastContactChecks[persona.id];

      return {
        persona,
        preview,
        characterCount,
        isOverLimit,
        lastContactInfo
      };
    });
  }, [personas, customTemplate, jobTitle, companyName, lastContactChecks]);

  // Compter les messages trop longs
  const overLimitCount = messagePreviews.filter(mp => mp.isOverLimit).length;
  const recentContactCount = messagePreviews.filter(mp => mp.lastContactInfo).length;

  // Initialiser les statuts des messages
  useState(() => {
    setMessageStatuses(personas.map(p => ({ personaId: p.id, status: 'pending' })));
    checkLastContacts();
  });

  const sendMessageToPersona = async (persona: Persona, message: string): Promise<boolean> => {
    if (!user) {
      console.error('❌ No user found for message sending');
      return false;
    }

    try {
      console.log('🚀 Sending message to persona:', persona.name);
      
      let leadId = persona.id;
      
      const { data: existingLead, error: leadError } = await supabase
        .from('leads')
        .select('id')
        .eq('author_profile_url', persona.profileUrl)
        .eq('lead_source', 'job_search')
        .maybeSingle();

      if (leadError) {
        console.error('❌ Error checking existing lead:', leadError);
      }

      if (existingLead) {
        leadId = existingLead.id;
        console.log('✅ Using existing job search lead:', leadId);
      } else {
        const leadData = {
          author_name: persona.name,
          author_profile_url: persona.profileUrl,
          author_headline: persona.title,
          company_name: persona.company || companyName,
          text: `Contact from job search: ${jobTitle} at ${companyName}`,
          title: `Job search contact - ${jobTitle}`,
          url: persona.profileUrl,
          author_profile_id: persona.linkedin_id || persona.id,
          lead_source: 'job_search',
          processing_status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString()
        };

        const { data: newLead, error: createError } = await supabase
          .from('leads')
          .insert(leadData)
          .select('id')
          .single();

        if (createError) {
          console.error('❌ Error creating lead:', createError);
          throw new Error(`Failed to create lead: ${createError.message}`);
        }

        leadId = newLead.id;
        console.log('✅ Created new job search lead:', leadId);
      }

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
        // Mettre à jour le dernier contact
        await supabase
          .from('leads')
          .update({
            last_contact_at: new Date().toISOString(),
            contacted_by_user_name: user.user_metadata?.full_name || 'Utilisateur Inconnu',
            contacted_by_user_id: user.id
          })
          .eq('id', leadId);

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

    // Vérifier s'il y a des messages trop longs
    if (overLimitCount > 0) {
      toast({
        title: "Messages trop longs",
        description: `${overLimitCount} message(s) dépassent la limite de ${MAX_MESSAGE_LENGTH} caractères.`,
        variant: "destructive"
      });
      return;
    }

    // Vérifier les contacts récents et demander confirmation
    if (recentContactCount > 0) {
      const shouldContinue = window.confirm(
        `Attention: ${recentContactCount} contact(s) ont été contactés dans les 7 derniers jours.\n\nVoulez-vous vraiment continuer l'envoi?`
      );
      
      if (!shouldContinue) {
        return;
      }
    }

    setIsSending(true);
    setMessageStatuses(personas.map(p => ({ personaId: p.id, status: 'pending' })));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < personas.length; i++) {
      const persona = personas[i];
      const messagePreview = messagePreviews.find(mp => mp.persona.id === persona.id);
      
      if (!messagePreview || messagePreview.isOverLimit) {
        console.log('⏭️ Skipping persona with over-limit message:', persona.name);
        continue;
      }

      const message = messagePreview.preview;

      setMessageStatuses(prev => prev.map(status => 
        status.personaId === persona.id 
          ? { ...status, status: 'sending' }
          : status
      ));

      try {
        const success = await sendMessageToPersona(persona, message);

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

        if (i < personas.length - 1) {
          const delay = Math.random() * 2000 + 3000;
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
    
    if (successCount > 0) {
      toast({
        title: "Envoi terminé",
        description: `${successCount}/${personas.length} messages envoyés avec succès.`,
      });
      
      // Recharger les vérifications de dernier contact
      await checkLastContacts();
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

  const getCharacterCountColor = (count: number) => {
    if (count > MAX_MESSAGE_LENGTH) return 'text-red-500';
    if (count > MAX_MESSAGE_LENGTH * 0.9) return 'text-orange-500';
    return 'text-gray-500';
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
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Bonjour {{ firstName }}, j'ai vu que {{ companyName }} recrute un {{ jobTitle }}..."
                      value={customTemplate}
                      onChange={(e) => setCustomTemplate(e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Limite: {MAX_MESSAGE_LENGTH} caractères</span>
                      {overLimitCount > 0 && (
                        <span className="text-red-500 font-medium">
                          ⚠️ {overLimitCount} message(s) trop long(s)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Variables disponibles :</strong></p>
                    <p><code className="bg-gray-100 px-1 rounded">{'{{ firstName }}'}</code> - Prénom du contact</p>
                    <p><code className="bg-gray-100 px-1 rounded">{'{{ jobTitle }}'}</code> - {jobTitle}</p>
                    <p><code className="bg-gray-100 px-1 rounded">{'{{ companyName }}'}</code> - {companyName}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Alertes */}
              {recentContactCount > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>{recentContactCount} contact(s)</strong> ont été contactés dans les 7 derniers jours. 
                    Une double validation sera demandée avant l'envoi.
                  </AlertDescription>
                </Alert>
              )}

              {/* Statuts d'envoi */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Statut d'envoi ({personas.length} contacts)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {personas.map((persona) => {
                      const status = messageStatuses.find(s => s.personaId === persona.id);
                      const messagePreview = messagePreviews.find(mp => mp.persona.id === persona.id);
                      
                      return (
                        <div key={persona.id} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{persona.name}</span>
                              {messagePreview?.lastContactInfo && (
                                <span className="text-xs text-orange-600">
                                  Contacté il y a {messagePreview.lastContactInfo.daysAgo}j par {messagePreview.lastContactInfo.contactedBy}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(status?.status || 'pending')}
                            <Badge variant={
                              messagePreview?.isOverLimit ? 'destructive' :
                              status?.status === 'sent' ? 'default' : 
                              status?.status === 'error' ? 'destructive' : 'secondary'
                            }>
                              {messagePreview?.isOverLimit ? 'Trop long' :
                               status?.status === 'pending' ? 'En attente' :
                               status?.status === 'sending' ? 'Envoi...' :
                               status?.status === 'sent' ? 'Envoyé' :
                               status?.status === 'error' ? 'Erreur' : 'En attente'}
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
                        <Card key={preview.persona.id} className={`border-l-4 ${
                          preview.isOverLimit ? 'border-l-red-500' : 
                          preview.lastContactInfo ? 'border-l-orange-500' : 'border-l-blue-500'
                        }`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{preview.persona.name}</p>
                                <p className="text-xs text-gray-500">{preview.persona.title}</p>
                                {preview.lastContactInfo && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    ⚠️ Contacté il y a {preview.lastContactInfo.daysAgo}j par {preview.lastContactInfo.contactedBy}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className="text-xs">
                                  Message {index + 1}
                                </Badge>
                                <span className={`text-xs font-medium ${getCharacterCountColor(preview.characterCount)}`}>
                                  {preview.characterCount}/{MAX_MESSAGE_LENGTH}
                                  {preview.isOverLimit && ' ⚠️'}
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <div className={`bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap border ${
                              preview.isOverLimit ? 'border-red-200 bg-red-50' : ''
                            }`}>
                              {preview.preview}
                            </div>
                            {preview.isOverLimit && (
                              <p className="text-xs text-red-600 mt-1">
                                Ce message dépasse la limite de {MAX_MESSAGE_LENGTH} caractères et ne sera pas envoyé.
                              </p>
                            )}
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
            {overLimitCount > 0 && (
              <span className="text-red-600 ml-2">
                • {overLimitCount} message(s) trop long(s)
              </span>
            )}
            {recentContactCount > 0 && (
              <span className="text-orange-600 ml-2">
                • {recentContactCount} contact(s) récent(s)
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Fermer
            </Button>
            
            <Button
              onClick={handleSendMessages}
              disabled={isSending || personas.length === 0 || overLimitCount > 0}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSending ? 'Envoi en cours...' : `Envoyer ${personas.length - overLimitCount} message(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
