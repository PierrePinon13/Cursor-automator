import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, UserCheck, Phone, ExternalLink, Send, Calendar, TriangleAlert, MessageSquare, UserPlus } from 'lucide-react';
import { HrProviderSelector } from './HrProviderSelector';
import { usePhoneRetrieval } from '@/hooks/usePhoneRetrieval';
import PhoneContactStatus from './PhoneContactStatus';
import ReminderDialog from './ReminderDialog';
import FeedbackDialog from './FeedbackDialog';
import ClientHistoryAlert from './ClientHistoryAlert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLeadInteractions } from '@/hooks/useLeadInteractions';

interface Lead {
  id: string;
  author_name: string;
  author_profile_url: string;
  phone_number?: string | null;
  phone_retrieved_at?: string | null;
  phone_contact_status?: string | null;
  phone_contact_at?: string | null;
  linkedin_message_sent_at?: string | null;
  last_contact_at?: string | null;
  unipile_response?: any;
  company_linkedin_id?: string | null;
  unipile_company_linkedin_id?: string | null;
  unipile_company?: string;
  company_name?: string;
  client_history_alert?: string | null;
}

interface LeadActionsProps {
  lead: Lead;
  onAction: (actionName: string) => void;
  onSendLinkedInMessage?: () => void;
  messageSending?: boolean;
  message?: string;
  onPhoneRetrieved?: (phoneNumber: string | null) => void;
  onContactUpdate?: () => void;
  isAtLinkedInLimit?: boolean;
}

const LeadActions = ({ 
  lead, 
  onAction,
  onSendLinkedInMessage,
  messageSending = false,
  message = '',
  onPhoneRetrieved,
  onContactUpdate,
  isAtLinkedInLimit = false
}: LeadActionsProps) => {
  const [showHrProviderSelector, setShowHrProviderSelector] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [hrProviderProcessing, setHrProviderProcessing] = useState(false);
  const { retrievePhone, loading: phoneLoading } = usePhoneRetrieval();
  const { toast } = useToast();
  const { user } = useAuth();
  const { slidingLeadId, slideToNextLead } = useLeadInteractions();

  const handleAction = (actionName: string) => {
    console.log('🔧 Handling action:', actionName, 'for lead:', lead.id);
    
    if (actionName === 'hr_provider') {
      handleHrProviderAction();
      return;
    }
    if (actionName === 'phone') {
      handlePhoneRetrieval();
      return;
    }
    if (actionName === 'reminder') {
      setShowReminderDialog(true);
      return;
    }
    if (actionName === 'mistargeted') {
      setShowFeedbackDialog(true);
      return;
    }
    onAction(actionName);
  };

  const handleHrProviderAction = async () => {
    if (!user) {
      console.error('❌ No user found');
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour effectuer cette action",
        variant: "destructive",
      });
      return;
    }

    console.log('🏢 Starting HR provider action for lead:', {
      leadId: lead.id,
      authorName: lead.author_name,
      unipileCompany: lead.unipile_company,
      companyName: lead.company_name
    });

    // Utiliser le nom de l'entreprise du lead (priorité à unipile_company, sinon company_name)
    const companyName = lead.unipile_company || lead.company_name;
    
    if (!companyName) {
      console.warn('⚠️ No company name found, opening HR provider selector');
      setShowHrProviderSelector(true);
      return;
    }

    setHrProviderProcessing(true);
    
    try {
      // 1. Créer automatiquement le prestataire RH avec l'entreprise du lead
      const companyLinkedInId = lead.unipile_company_linkedin_id || lead.company_linkedin_id;
      
      console.log('🏭 Creating HR provider for company:', {
        name: companyName,
        linkedinId: companyLinkedInId
      });

      const { data: newHrProvider, error: createError } = await supabase
        .from('hr_providers')
        .insert({
          company_name: companyName,
          company_linkedin_url: null,
          company_linkedin_id: companyLinkedInId
        })
        .select()
        .single();

      if (createError) {
        // Si l'entreprise existe déjà, la récupérer
        if (createError.code === '23505') { // Unique constraint violation
          console.log('🔄 Company already exists, fetching existing provider');
          const { data: existingProvider, error: fetchError } = await supabase
            .from('hr_providers')
            .select('id, company_name')
            .eq('company_name', companyName)
            .single();

          if (fetchError) {
            throw fetchError;
          }

          await assignHrProvider(existingProvider.id, existingProvider.company_name);
          return;
        }
        throw createError;
      }

      if (newHrProvider) {
        console.log('✅ HR provider created:', newHrProvider);
        await assignHrProvider(newHrProvider.id, newHrProvider.company_name);
      }

    } catch (error) {
      console.error('❌ Error creating HR provider:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le prestataire RH. Utilisation du sélecteur manuel.",
        variant: "destructive",
      });
      // En cas d'erreur, ouvrir le sélecteur manuel
      setShowHrProviderSelector(true);
    } finally {
      setHrProviderProcessing(false);
    }
  };

  const assignHrProvider = async (hrProviderId: string, hrProviderName: string) => {
    console.log('📋 Assigning HR provider:', { hrProviderId, hrProviderName, leadId: lead.id });
    
    try {
      // 2. Marquer le lead comme prestataire RH dans la table leads
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          processing_status: 'filtered_hr_provider',
          matched_hr_provider_id: hrProviderId,
          matched_hr_provider_name: hrProviderName,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Lead updated with HR provider status');

      // 3. Déclencher le filtrage automatique des autres leads de cette entreprise
      const companyLinkedInId = lead.unipile_company_linkedin_id || lead.company_linkedin_id;
      if (companyLinkedInId) {
        console.log('🔄 Triggering automatic filtering for company LinkedIn ID:', companyLinkedInId);
        
        try {
          const { data, error } = await supabase.functions.invoke('filter-hr-provider-leads', {
            body: { hrProviderId }
          });

          if (error) {
            console.error('❌ Error filtering HR provider leads:', error);
          } else if (data?.success && data.filteredCount > 0) {
            console.log('✅ Additional leads filtered:', data.filteredCount);
            toast({
              title: "Leads filtrés",
              description: `${data.filteredCount} leads supplémentaires de ${hrProviderName} ont été filtrés automatiquement.`,
            });
          }
        } catch (error) {
          console.error('❌ Error calling filter function:', error);
        }
      }

      toast({
        title: "Prestataire RH créé et assigné",
        description: `${hrProviderName} a été ajouté comme prestataire RH et le lead a été filtré.`,
      });

      // 4. Déclencher l'action de callback pour mettre à jour l'interface
      console.log('🔄 Triggering action callback');
      onAction('hr_provider_assigned');

    } catch (error) {
      console.error('❌ Error assigning HR provider:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner le prestataire RH.",
        variant: "destructive",
      });
    }
  };

  const handlePhoneRetrieval = async () => {
    const phoneNumber = await retrievePhone(lead.id);
    if (onPhoneRetrieved) {
      onPhoneRetrieved(phoneNumber);
    }
  };

  const handleMistargeted = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('mistargeted_posts')
        .insert({
          lead_id: lead.id,
          reported_by_user_id: user.id,
          reported_by_user_name: user.user_metadata?.full_name || user.email,
          author_name: lead.author_name,
          author_profile_url: lead.author_profile_url,
          reason: 'Publication signalée comme mal ciblée par un utilisateur'
        });

      if (error) throw error;

      toast({
        title: "Publication signalée",
        description: "Cette publication a été marquée comme mal ciblée et envoyée aux administrateurs.",
      });

      onAction('mistargeted_completed');
    } catch (error) {
      console.error('Error reporting mistargeted post:', error);
      toast({
        title: "Erreur",
        description: "Impossible de signaler cette publication.",
        variant: "destructive",
      });
    }
  };

  const handleHrProviderSelected = async (hrProviderId: string) => {
    console.log(`HR Provider ${hrProviderId} selected for lead ${lead.id}`);
    
    try {
      // Récupérer les infos du prestataire RH
      const { data: hrProvider, error: hrError } = await supabase
        .from('hr_providers')
        .select('company_name, company_linkedin_id')
        .eq('id', hrProviderId)
        .single();

      if (hrError) {
        console.error('Error fetching HR provider:', hrError);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les informations du prestataire RH.",
          variant: "destructive",
        });
        return;
      }

      await assignHrProvider(hrProviderId, hrProvider.company_name);
      setShowHrProviderSelector(false);

    } catch (error) {
      console.error('Error in HR provider assignment:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'assignation du prestataire RH.",
        variant: "destructive",
      });
    }
  };

  const handleContactUpdate = () => {
    if (onContactUpdate) {
      onContactUpdate();
    }
  };

  const handleLinkedInMessage = () => {
    if (onSendLinkedInMessage) {
      // Animation de glissement
      slideToNextLead(lead.id, () => {
        onSendLinkedInMessage();
      });
    }
  };

  const handleFeedbackSubmitted = () => {
    // Actualiser la liste des leads après envoi du feedback
    onAction('feedback_submitted');
  };

  const canSendMessage = onSendLinkedInMessage && 
    message.trim().length > 0 && 
    message.length <= 300 && 
    !isAtLinkedInLimit;
  const messageIsTooLong = message.length > 300;

  const formatContactDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isSliding = slidingLeadId === lead.id;

  return (
    <div className={`space-y-4 transition-transform duration-300 ${isSliding ? 'transform -translate-x-full opacity-0' : ''}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Actions disponibles</h3>
      
      {/* Client History Alert */}
      <ClientHistoryAlert alert={lead.client_history_alert} />
      
      {/* Last Contact Info */}
      {lead.last_contact_at && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-sm text-green-700">
            <strong>Dernier contact :</strong> {formatContactDate(lead.last_contact_at)}
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {/* Message LinkedIn Section */}
        {onSendLinkedInMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-700">
              <div className="text-blue-600 font-bold text-lg">in</div>
              <span className="font-medium">Message LinkedIn</span>
            </div>
            
            {lead.linkedin_message_sent_at && (
              <div className="text-xs text-green-600 bg-green-50 p-2 rounded flex items-center gap-2">
                <MessageSquare className="h-3 w-3" />
                Message envoyé le {formatContactDate(lead.linkedin_message_sent_at)}
              </div>
            )}
            
            {messageIsTooLong && (
              <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                <span className="text-red-600 font-bold">✕</span>
                <span>Le message dépasse la limite de 300 caractères. Veuillez le raccourcir.</span>
              </div>
            )}
            
            {isAtLinkedInLimit && (
              <div className="flex items-start gap-2 text-green-600 text-sm bg-green-50 p-2 rounded">
                <span className="text-green-600 font-bold">🎉</span>
                <span>Limite quotidienne atteinte ! Excellente implication, à demain !</span>
              </div>
            )}
            
            <Button
              onClick={handleLinkedInMessage}
              disabled={!canSendMessage || messageSending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              size="lg"
            >
              {messageSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer sur LinkedIn
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Phone Section */}
        {lead.phone_number ? (
          <PhoneContactStatus
            leadId={lead.id}
            phoneNumber={lead.phone_number}
            currentStatus={lead.phone_contact_status}
            onStatusUpdate={handleContactUpdate}
          />
        ) : (
          <Button
            variant="outline"
            onClick={() => handleAction('phone')}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 h-auto text-left justify-start hover:bg-gray-100"
            disabled={phoneLoading}
          >
            <Phone className="h-5 w-5 mr-3" />
            <span className="font-medium text-gray-700">
              {phoneLoading ? 'Recherche...' : 'Récupérer téléphone'}
            </span>
          </Button>
        )}
        
        {/* Schedule reminder */}
        <Button
          variant="outline"
          onClick={() => handleAction('reminder')}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 h-auto text-left justify-start hover:bg-gray-100"
        >
          <Calendar className="h-5 w-5 mr-3" />
          <span className="font-medium text-gray-700">Planifier rappel</span>
        </Button>
        
        {/* HR Provider */}
        <Button
          variant="outline"
          onClick={() => handleAction('hr_provider')}
          disabled={hrProviderProcessing}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 h-auto text-left justify-start hover:bg-gray-100"
        >
          <UserCheck className="h-5 w-5 mr-3" />
          <span className="font-medium text-gray-700">
            {hrProviderProcessing ? 'Traitement...' : 'Prestataire RH'}
          </span>
        </Button>
        
        {/* Publication mal ciblée */}
        <Button
          variant="outline"
          onClick={() => handleAction('mistargeted')}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 h-auto text-left justify-start hover:bg-gray-100"
        >
          <TriangleAlert className="h-5 w-5 mr-3" />
          <span className="font-medium text-gray-700">Publication mal ciblée</span>
        </Button>
      </div>

      <HrProviderSelector
        open={showHrProviderSelector}
        onOpenChange={setShowHrProviderSelector}
        lead={lead}
        onHrProviderSelected={handleHrProviderSelected}
      />

      <ReminderDialog
        open={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        leadId={lead.id}
        leadName={lead.author_name || 'Lead sans nom'}
      />

      <FeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
        lead={lead}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />
    </div>
  );
};

export default LeadActions;
