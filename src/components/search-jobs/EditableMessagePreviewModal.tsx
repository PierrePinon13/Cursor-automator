
import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, User, AlertTriangle, Edit } from 'lucide-react';
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

interface EditableMessagePreviewModalProps {
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

interface PersonalizedMessage {
  personaId: string;
  message: string;
  characterCount: number;
  isOverLimit: boolean;
  isEdited: boolean;
}

const MAX_MESSAGE_LENGTH = 300;

export const EditableMessagePreviewModal = ({ 
  isOpen, 
  onClose, 
  personas, 
  jobTitle, 
  companyName,
  initialTemplate = ''
}: EditableMessagePreviewModalProps) => {
  const [globalTemplate, setGlobalTemplate] = useState(initialTemplate);
  const [personalizedMessages, setPersonalizedMessages] = useState<PersonalizedMessage[]>([]);
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [lastContactChecks, setLastContactChecks] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('template');
  const { user } = useAuth();

  // Fonction pour remplacer les variables dans le template - CORRIGÉE
  const replaceVariables = (template: string, persona: Persona) => {
    const firstName = persona.name.split(' ')[0] || persona.name;
    const lastName = persona.name.split(' ').slice(1).join(' ') || persona.name;
    
    return template
      // Anciennes variables avec accolades
      .replace(/\{\{\s*firstName\s*\}\}/g, firstName)
      .replace(/\{\{\s*jobTitle\s*\}\}/g, jobTitle)
      .replace(/\{\{\s*companyName\s*\}\}/g, companyName)
      // Nouvelles variables avec crochets
      .replace(/\[PRENOM\]/g, firstName)
      .replace(/\[NOM\]/g, lastName)
      .replace(/\[POSTE\]/g, jobTitle)
      .replace(/\[ENTREPRISE\]/g, companyName);
  };

  // Initialiser les messages personnalisés à partir du template global
  useEffect(() => {
    if (personas.length > 0) {
      const newMessages = personas.map(persona => {
        const existingMessage = personalizedMessages.find(pm => pm.personaId === persona.id);
        const baseMessage = globalTemplate 
          ? replaceVariables(globalTemplate, persona) 
          : `Bonjour ${persona.name.split(' ')[0]},\n\nJ'ai vu que ${companyName} recrute un ${jobTitle}.\n\nJe connais bien ces recherches, je peux vous présenter des candidats si cela peut vous faire gagner du temps.\n\nBonne journée`;
        
        const message = existingMessage?.isEdited ? existingMessage.message : baseMessage;
        const characterCount = message.length;
        
        return {
          personaId: persona.id,
          message,
          characterCount,
          isOverLimit: characterCount > MAX_MESSAGE_LENGTH,
          isEdited: existingMessage?.isEdited || false
        };
      });
      setPersonalizedMessages(newMessages);
      setMessageStatuses(personas.map(p => ({ personaId: p.id, status: 'pending' as const })));
    }
  }, [personas, globalTemplate, companyName, jobTitle]);

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

  useEffect(() => {
    if (isOpen && personas.length > 0) {
      checkLastContacts();
    }
  }, [isOpen, personas]);

  // Appliquer le template global à tous les messages non édités
  const applyGlobalTemplate = () => {
    setPersonalizedMessages(prev => 
      prev.map(msg => {
        if (msg.isEdited) return msg;
        
        const persona = personas.find(p => p.id === msg.personaId);
        if (!persona) return msg;
        
        const newMessage = globalTemplate 
          ? replaceVariables(globalTemplate, persona)
          : msg.message;
        
        return {
          ...msg,
          message: newMessage,
          characterCount: newMessage.length,
          isOverLimit: newMessage.length > MAX_MESSAGE_LENGTH
        };
      })
    );
  };

  // Mettre à jour un message individuel
  const updatePersonalizedMessage = (personaId: string, newMessage: string) => {
    setPersonalizedMessages(prev => 
      prev.map(msg => 
        msg.personaId === personaId 
          ? {
              ...msg,
              message: newMessage,
              characterCount: newMessage.length,
              isOverLimit: newMessage.length > MAX_MESSAGE_LENGTH,
              isEdited: true
            }
          : msg
      )
    );
  };

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
    const overLimitCount = personalizedMessages.filter(msg => msg.isOverLimit).length;
    const recentContactCount = personas.filter(p => lastContactChecks[p.id]).length;

    if (overLimitCount > 0) {
      toast({
        title: "Messages trop longs",
        description: `${overLimitCount} message(s) dépassent la limite de ${MAX_MESSAGE_LENGTH} caractères.`,
        variant: "destructive"
      });
      return;
    }

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
      const personalizedMessage = personalizedMessages.find(msg => msg.personaId === persona.id);
      
      if (!personalizedMessage || personalizedMessage.isOverLimit) {
        console.log('⏭️ Skipping persona with over-limit message:', persona.name);
        continue;
      }

      const message = personalizedMessage.message;

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
      
      await checkLastContacts();
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

  const overLimitCount = personalizedMessages.filter(msg => msg.isOverLimit).length;
  const recentContactCount = personas.filter(p => lastContactChecks[p.id]).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages personnalisés - {jobTitle}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">Template global</TabsTrigger>
            <TabsTrigger value="preview">Prévisualisations ({personas.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template de base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Bonjour [PRENOM], j'ai vu que [ENTREPRISE] recrute un [POSTE]..."
                  value={globalTemplate}
                  onChange={(e) => setGlobalTemplate(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Variables disponibles :</strong></p>
                    <p><code className="bg-gray-100 px-1 rounded">[PRENOM]</code> - Prénom du contact</p>
                    <p><code className="bg-gray-100 px-1 rounded">[NOM]</code> - Nom du contact</p>
                    <p><code className="bg-gray-100 px-1 rounded">[POSTE]</code> - {jobTitle}</p>
                    <p><code className="bg-gray-100 px-1 rounded">[ENTREPRISE]</code> - {companyName}</p>
                  </div>
                  <Button onClick={applyGlobalTemplate} variant="outline">
                    Appliquer à tous les messages non-modifiés
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Messages personnalisés */}
              <div>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Messages personnalisés</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4">
                        {personalizedMessages.map((msgData) => {
                          const persona = personas.find(p => p.id === msgData.personaId);
                          if (!persona) return null;

                          return (
                            <Card key={persona.id} className={`border-l-4 ${
                              msgData.isOverLimit ? 'border-l-red-500' : 
                              lastContactChecks[persona.id] ? 'border-l-orange-500' : 'border-l-blue-500'
                            }`}>
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-sm">{persona.name}</p>
                                    <p className="text-xs text-gray-500">{persona.title}</p>
                                    {lastContactChecks[persona.id] && (
                                      <p className="text-xs text-orange-600 mt-1">
                                        ⚠️ Contacté il y a {lastContactChecks[persona.id].daysAgo}j
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    {msgData.isEdited && (
                                      <Badge variant="outline" className="text-xs">
                                        <Edit className="h-3 w-3 mr-1" />
                                        Modifié
                                      </Badge>
                                    )}
                                    <span className={`text-xs font-medium ${getCharacterCountColor(msgData.characterCount)}`}>
                                      {msgData.characterCount}/{MAX_MESSAGE_LENGTH}
                                      {msgData.isOverLimit && ' ⚠️'}
                                    </span>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <Textarea
                                  value={msgData.message}
                                  onChange={(e) => updatePersonalizedMessage(persona.id, e.target.value)}
                                  className={`min-h-[100px] text-sm ${
                                    msgData.isOverLimit ? 'border-red-200 bg-red-50' : ''
                                  }`}
                                />
                                {msgData.isOverLimit && (
                                  <p className="text-xs text-red-600 mt-1">
                                    Ce message dépasse la limite et ne sera pas envoyé.
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Statuts d'envoi */}
              <div>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Statut d'envoi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {personas.map((persona) => {
                        const status = messageStatuses.find(s => s.personaId === persona.id);
                        const msgData = personalizedMessages.find(m => m.personaId === persona.id);
                        
                        return (
                          <div key={persona.id} className="flex items-center justify-between p-2 rounded border">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{persona.name}</span>
                                {lastContactChecks[persona.id] && (
                                  <span className="text-xs text-orange-600">
                                    Contacté récemment
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status?.status || 'pending')}
                              <Badge variant={
                                msgData?.isOverLimit ? 'destructive' :
                                status?.status === 'sent' ? 'default' : 
                                status?.status === 'error' ? 'destructive' : 'secondary'
                              }>
                                {msgData?.isOverLimit ? 'Trop long' :
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
            </div>
          </TabsContent>
        </Tabs>

        {/* Alertes */}
        {recentContactCount > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>{recentContactCount} contact(s)</strong> ont été contactés dans les 7 derniers jours.
            </AlertDescription>
          </Alert>
        )}

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
