
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, UserCheck, Phone, ExternalLink, Send, Calendar, TriangleAlert } from 'lucide-react';
import { HrProviderSelector } from './HrProviderSelector';
import { usePhoneRetrieval } from '@/hooks/usePhoneRetrieval';
import PhoneContactStatus from './PhoneContactStatus';

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
}

interface LeadActionsProps {
  lead: Lead;
  onAction: (actionName: string) => void;
  onSendLinkedInMessage?: () => void;
  messageSending?: boolean;
  message?: string;
  onPhoneRetrieved?: (phoneNumber: string | null) => void;
  onContactUpdate?: () => void;
}

const LeadActions = ({ 
  lead, 
  onAction,
  onSendLinkedInMessage,
  messageSending = false,
  message = '',
  onPhoneRetrieved,
  onContactUpdate
}: LeadActionsProps) => {
  const [showHrProviderSelector, setShowHrProviderSelector] = useState(false);
  const { retrievePhone, loading: phoneLoading } = usePhoneRetrieval();

  const handleAction = (actionName: string) => {
    if (actionName === 'hr_provider') {
      setShowHrProviderSelector(true);
      return;
    }
    if (actionName === 'phone') {
      handlePhoneRetrieval();
      return;
    }
    onAction(actionName);
  };

  const handlePhoneRetrieval = async () => {
    const phoneNumber = await retrievePhone(lead.id);
    if (onPhoneRetrieved) {
      onPhoneRetrieved(phoneNumber);
    }
  };

  const handleHrProviderSelected = (hrProviderId: string) => {
    console.log(`HR Provider ${hrProviderId} selected for lead ${lead.id}`);
    onAction('hr_provider_assigned');
    setShowHrProviderSelector(false);
  };

  const handleContactUpdate = () => {
    if (onContactUpdate) {
      onContactUpdate();
    }
  };

  const canSendMessage = onSendLinkedInMessage && message.trim().length > 0 && message.length <= 300;
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Actions disponibles</h3>
      
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
              <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                ✓ Message envoyé le {formatContactDate(lead.linkedin_message_sent_at)}
              </div>
            )}
            
            {messageIsTooLong && (
              <div className="flex items-start gap-2 text-red-600 text-sm">
                <span className="text-red-600 font-bold">✕</span>
                <span>Le message dépasse la limite de 300 caractères. Veuillez le raccourcir.</span>
              </div>
            )}
            
            <Button
              onClick={onSendLinkedInMessage}
              disabled={!canSendMessage || messageSending}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-2"
              size="lg"
            >
              <Send className="h-4 w-4" />
              {messageSending ? 'Envoi...' : 'Envoyer le message LinkedIn'}
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
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 h-auto text-left justify-start hover:bg-gray-100"
        >
          <UserCheck className="h-5 w-5 mr-3" />
          <span className="font-medium text-gray-700">Prestataire RH</span>
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
    </div>
  );
};

export default LeadActions;
