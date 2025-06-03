
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Phone, Clock, AlertTriangle, Building2 } from 'lucide-react';
import { usePhoneRetrieval } from '@/hooks/usePhoneRetrieval';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PhoneContactStatus from './PhoneContactStatus';
import ReminderDialog from './ReminderDialog';

interface Lead {
  id: string;
  author_name: string;
  phone_number?: string | null;
  phone_retrieved_at?: string | null;
  phone_contact_status?: string | null;
  phone_contact_at?: string | null;
  linkedin_message_sent_at?: string | null;
  last_contact_at?: string | null;
}

interface LeadActionsSectionProps {
  lead: Lead;
  onAction: (actionName: string) => void;
  onSendLinkedInMessage: () => void;
  messageSending: boolean;
  customMessage: string;
  onPhoneRetrieved?: (phoneNumber: string | null) => void;
  onContactUpdate?: () => void;
}

const LeadActionsSection = ({ 
  lead, 
  onAction,
  onSendLinkedInMessage,
  messageSending,
  customMessage,
  onPhoneRetrieved,
  onContactUpdate
}: LeadActionsSectionProps) => {
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const { retrievePhone, loading: phoneLoading } = usePhoneRetrieval();
  const { toast } = useToast();

  const handleRetrievePhone = async () => {
    try {
      const phoneNumber = await retrievePhone(lead.id);
      onPhoneRetrieved?.(phoneNumber);
      toast({
        title: phoneNumber ? "Téléphone récupéré" : "Téléphone non trouvé",
        description: phoneNumber ? `Numéro : ${phoneNumber}` : "Aucun numéro de téléphone trouvé pour ce lead",
      });
    } catch (error) {
      console.error('Error retrieving phone:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer le numéro de téléphone",
        variant: "destructive",
      });
    }
  };

  const handleMistargetedPost = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour effectuer cette action",
          variant: "destructive",
        });
        return;
      }

      await supabase
        .from('mistargeted_posts')
        .insert({
          lead_id: lead.id,
          author_name: lead.author_name,
          reason: 'Publication signalée comme mal ciblée',
          reported_by_user_id: user.id
        });
      
      toast({
        title: "Publication signalée",
        description: "Cette publication a été signalée comme mal ciblée",
      });
      
      onAction('mistargeted_post');
    } catch (error) {
      console.error('Error reporting mistargeted post:', error);
      toast({
        title: "Erreur",
        description: "Impossible de signaler cette publication",
        variant: "destructive",
      });
    }
  };

  const isMessageTooLong = customMessage.length > 300;
  const hasLinkedInMessage = !!lead.linkedin_message_sent_at;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-blue-600" />
            Actions LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={onSendLinkedInMessage}
            disabled={messageSending || isMessageTooLong || !customMessage.trim() || hasLinkedInMessage}
            className="w-full"
            size="lg"
          >
            <Send className="h-4 w-4 mr-2" />
            {messageSending ? 'Envoi en cours...' : 
             hasLinkedInMessage ? 'Message déjà envoyé' : 
             'Envoyer le message LinkedIn'}
          </Button>
          
          {hasLinkedInMessage && (
            <div className="text-sm text-green-600 text-center">
              Message envoyé le {new Date(lead.linkedin_message_sent_at!).toLocaleDateString('fr-FR')}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5 text-green-600" />
            Contact téléphonique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!lead.phone_number ? (
            <Button
              onClick={handleRetrievePhone}
              disabled={phoneLoading}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Phone className="h-4 w-4 mr-2" />
              {phoneLoading ? 'Recherche...' : 'Récupérer le téléphone'}
            </Button>
          ) : (
            <PhoneContactStatus
              leadId={lead.id}
              phoneNumber={lead.phone_number}
              currentStatus={lead.phone_contact_status}
              onStatusUpdate={() => onContactUpdate?.()}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-purple-600" />
            Suivi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => setReminderDialogOpen(true)}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Clock className="h-4 w-4 mr-2" />
            Planifier un rappel
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Signalement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleMistargetedPost}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Publication mal ciblée
          </Button>
          
          <Button
            onClick={() => onAction('hr_provider')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Prestataire RH
          </Button>
        </CardContent>
      </Card>

      <ReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        leadId={lead.id}
        leadName={lead.author_name}
      />
    </div>
  );
};

export default LeadActionsSection;
