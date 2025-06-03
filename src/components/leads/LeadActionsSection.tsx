
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Phone, Clock, AlertTriangle, Building2, Linkedin } from 'lucide-react';
import { usePhoneRetrieval } from '@/hooks/usePhoneRetrieval';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PhoneContactStatus from './PhoneContactStatus';
import ReminderDialog from './ReminderDialog';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();

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
      {/* Action principale LinkedIn */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Linkedin className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900">Message LinkedIn</h4>
            <p className="text-xs text-blue-700">Action principale</p>
          </div>
        </div>
        
        <Button
          onClick={onSendLinkedInMessage}
          disabled={messageSending || isMessageTooLong || !customMessage.trim() || hasLinkedInMessage}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          size="lg"
        >
          <Send className="h-4 w-4 mr-2" />
          {messageSending ? 'Envoi en cours...' : 
           hasLinkedInMessage ? 'Message déjà envoyé' : 
           'Envoyer le message LinkedIn'}
        </Button>
        
        {hasLinkedInMessage && (
          <div className="text-xs text-green-600 text-center mt-2">
            Message envoyé le {new Date(lead.linkedin_message_sent_at!).toLocaleDateString('fr-FR')}
          </div>
        )}
      </div>

      {/* Actions secondaires */}
      <div className="space-y-3">
        {/* Contact téléphonique */}
        {!lead.phone_number ? (
          <Button
            onClick={handleRetrievePhone}
            disabled={phoneLoading}
            variant="outline"
            className="w-full h-10 justify-start bg-white hover:bg-green-50 border-green-200"
          >
            <div className="p-1 bg-green-100 rounded mr-3">
              <Phone className="h-4 w-4 text-green-600" />
            </div>
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

        {/* Planifier un rappel */}
        <Button
          onClick={() => setReminderDialogOpen(true)}
          variant="outline"
          className="w-full h-10 justify-start bg-white hover:bg-purple-50 border-purple-200"
        >
          <div className="p-1 bg-purple-100 rounded mr-3">
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          Planifier un rappel
        </Button>
      </div>

      {/* Signalement */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-orange-800">
            <div className="p-1 bg-orange-100 rounded">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
            Signalement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={handleMistargetedPost}
            variant="outline"
            className="w-full h-9 justify-start bg-white hover:bg-orange-50 border-orange-200"
            size="sm"
          >
            <AlertTriangle className="h-3 w-3 mr-2 text-orange-600" />
            Publication mal ciblée
          </Button>
          
          <Button
            onClick={() => onAction('hr_provider')}
            variant="outline"
            className="w-full h-9 justify-start bg-white hover:bg-orange-50 border-orange-200"
            size="sm"
          >
            <Building2 className="h-3 w-3 mr-2 text-orange-600" />
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
