import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLastContactCheck } from '@/hooks/useLastContactCheck';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Send, ArrowLeft, AlertTriangle, User, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import GlobalPageHeader from '@/components/GlobalPageHeader';
import PageLayout from '@/components/PageLayout';

interface Persona {
  id: string;
  name: string;
  title: string;
  profileUrl: string;
  company?: string;
  linkedin_id?: string;
  jobTitle?: string;
  jobCompany?: string;
}

interface PersonalizedMessage {
  personaId: string;
  message: string;
  characterCount: number;
  isOverLimit: boolean;
  isEdited: boolean;
}

interface MessageStatus {
  personaId: string;
  status: 'pending' | 'sending' | 'sent' | 'error';
  error?: string;
}

const MAX_MESSAGE_LENGTH = 300;

const BulkProspecting = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [searchName, setSearchName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [globalTemplate, setGlobalTemplate] = useState('');
  const [personalizedMessages, setPersonalizedMessages] = useState<PersonalizedMessage[]>([]);
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Utiliser le hook pour vérifier les derniers contacts
  const { lastContactChecks, refetch: refetchLastContacts } = useLastContactCheck(personas);

  // Récupérer les données depuis les paramètres URL
  useEffect(() => {
    const contacts = searchParams.get('contacts');
    const searchNameParam = searchParams.get('searchName');
    const jobTitleParam = searchParams.get('jobTitle');
    const companyNameParam = searchParams.get('companyName');

    if (contacts) {
      try {
        const parsedContacts = JSON.parse(decodeURIComponent(contacts));
        setPersonas(parsedContacts);
      } catch (error) {
        console.error('Error parsing contacts:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les contacts",
          variant: "destructive"
        });
      }
    }

    if (searchNameParam) setSearchName(decodeURIComponent(searchNameParam));
    if (jobTitleParam) setJobTitle(decodeURIComponent(jobTitleParam));
    if (companyNameParam) setCompanyName(decodeURIComponent(companyNameParam));
  }, [searchParams]);

  // Fonction pour remplacer les variables dans le template
  const replaceVariables = (template: string, persona: Persona) => {
    if (!template || !persona) return template;
    
    const nameParts = persona.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    let result = template;
    
    // Remplacer les variables avec crochets
    result = result.replace(/\[PRENOM\]/g, firstName);
    result = result.replace(/\[NOM\]/g, lastName);
    result = result.replace(/\[POSTE\]/g, persona.jobTitle || jobTitle || '');
    result = result.replace(/\[ENTREPRISE\]/g, persona.jobCompany || companyName || '');
    
    return result;
  };

  // Template par défaut
  const getDefaultTemplate = () => {
    return `Bonjour [PRENOM],

J'ai vu que [ENTREPRISE] recrute un [POSTE].

Je connais bien ces recherches, je peux vous présenter des candidats si cela peut vous faire gagner du temps.

Bonne journée`;
  };

  // Variables disponibles
  const variables = [
    { name: '[PRENOM]', description: 'Prénom du contact' },
    { name: '[NOM]', description: 'Nom du contact' },
    { name: '[POSTE]', description: 'Titre du poste' },
    { name: '[ENTREPRISE]', description: 'Nom de l\'entreprise' }
  ];

  // Insérer une variable dans le template
  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('#global-template') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = globalTemplate.substring(0, start) + variable + globalTemplate.substring(end);
      setGlobalTemplate(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      setGlobalTemplate(globalTemplate + variable);
    }
  };

  // Initialiser les messages personnalisés
  useEffect(() => {
    if (personas.length > 0) {
      const templateToUse = globalTemplate || getDefaultTemplate();
      
      const newMessages = personas.map(persona => {
        const existingMessage = personalizedMessages.find(pm => pm.personaId === persona.id);
        const baseMessage = replaceVariables(templateToUse, persona);
        
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

  // Appliquer le template global
  const applyGlobalTemplate = () => {
    const templateToUse = globalTemplate || getDefaultTemplate();
    
    setPersonalizedMessages(prev => 
      prev.map(msg => {
        if (msg.isEdited) return msg;
        
        const persona = personas.find(p => p.id === msg.personaId);
        if (!persona) return msg;
        
        const newMessage = replaceVariables(templateToUse, persona);
        
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

  // Envoyer un message à un persona
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

  // Envoyer tous les messages
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
      
      await refetchLastContacts();
    }
  };

  const getCharacterCountColor = (count: number) => {
    if (count > MAX_MESSAGE_LENGTH) return 'text-red-500';
    if (count > MAX_MESSAGE_LENGTH * 0.9) return 'text-orange-500';
    return 'text-gray-500';
  };

  const overLimitCount = personalizedMessages.filter(msg => msg.isOverLimit).length;
  const recentContactCount = personas.filter(p => lastContactChecks[p.id]).length;

  if (personas.length === 0) {
    return (
      <PageLayout>
        <GlobalPageHeader
          title="Prospection volumique"
          subtitle="Contactez plusieurs prospects en même temps"
          icon={<MessageSquare className="h-6 w-6 text-blue-600" />}
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Search Jobs", href: "/search-jobs" },
            { label: "Prospection volumique" }
          ]}
        />
        <div className="text-center py-16">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun contact sélectionné
          </h3>
          <p className="text-gray-600 mb-6">
            Sélectionnez des contacts depuis la recherche d'emplois pour commencer la prospection.
          </p>
          <Button onClick={() => navigate('/search-jobs')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour à la recherche d'emplois
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <GlobalPageHeader
        title="Prospection volumique"
        subtitle={`${personas.length} contact(s) sélectionné(s) - ${searchName}`}
        icon={<MessageSquare className="h-6 w-6 text-blue-600" />}
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Search Jobs", href: "/search-jobs" },
          { label: "Prospection volumique" }
        ]}
        actions={
          <Button 
            variant="outline" 
            onClick={() => navigate('/search-jobs')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* Colonne gauche - Template global */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Template de base
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            {/* Boutons de variables */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Variables disponibles :</label>
              <div className="flex flex-wrap gap-2">
                {variables.map((variable) => (
                  <Button
                    key={variable.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(variable.name)}
                    className="flex items-center gap-1 text-xs h-7"
                    title={variable.description}
                  >
                    <Plus className="h-3 w-3" />
                    {variable.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Template */}
            <div className="flex-1 flex flex-col">
              <Textarea
                id="global-template"
                placeholder={getDefaultTemplate()}
                value={globalTemplate}
                onChange={(e) => setGlobalTemplate(e.target.value)}
                className="flex-1 min-h-[200px] resize-none"
              />
            </div>

            <Button onClick={applyGlobalTemplate} variant="outline" className="w-full">
              Appliquer à tous les messages non-modifiés
            </Button>
          </CardContent>
        </Card>

        {/* Colonne droite - Aperçus des messages */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Messages personnalisés ({personas.length})
              </span>
              <div className="text-sm text-gray-600">
                {overLimitCount > 0 && (
                  <span className="text-red-600">
                    {overLimitCount} trop long(s)
                  </span>
                )}
                {recentContactCount > 0 && (
                  <span className="text-orange-600 ml-2">
                    {recentContactCount} récent(s)
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {personalizedMessages.map((msgData) => {
                  const persona = personas.find(p => p.id === msgData.personaId);
                  if (!persona) return null;
                  const status = messageStatuses.find(s => s.personaId === persona.id);

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
                                Modifié
                              </Badge>
                            )}
                            <span className={`text-xs font-medium ${getCharacterCountColor(msgData.characterCount)}`}>
                              {msgData.characterCount}/{MAX_MESSAGE_LENGTH}
                              {msgData.isOverLimit && ' ⚠️'}
                            </span>
                            {status && (
                              <Badge variant={
                                status.status === 'sent' ? 'default' : 
                                status.status === 'error' ? 'destructive' : 
                                status.status === 'sending' ? 'secondary' : 'outline'
                              } className="text-xs">
                                {status.status === 'pending' ? 'En attente' :
                                 status.status === 'sending' ? 'Envoi...' :
                                 status.status === 'sent' ? 'Envoyé' :
                                 status.status === 'error' ? 'Erreur' : 'En attente'}
                              </Badge>
                            )}
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
                          disabled={isSending}
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

      {/* Alertes */}
      {recentContactCount > 0 && (
        <Alert className="border-orange-200 bg-orange-50 mt-6">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{recentContactCount} contact(s)</strong> ont été contactés dans les 7 derniers jours.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t mt-6">
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
        
        <Button
          onClick={() => handleSendMessages()}
          disabled={isSending || personas.length === 0 || overLimitCount > 0}
          className="flex items-center gap-2"
          size="lg"
        >
          <Send className="h-4 w-4" />
          {isSending ? 'Envoi en cours...' : `Envoyer ${personas.length - overLimitCount} message(s)`}
        </Button>
      </div>
    </PageLayout>
  );
};

export default BulkProspecting;
