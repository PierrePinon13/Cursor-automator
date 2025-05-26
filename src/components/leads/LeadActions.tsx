
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, UserCheck, Phone, ExternalLink, Send } from 'lucide-react';
import { HrProviderSelector } from './HrProviderSelector';
import { usePhoneRetrieval } from '@/hooks/usePhoneRetrieval';

interface Lead {
  id: string;
  author_name: string;
  author_profile_url: string;
  phone_number?: string | null;
  phone_retrieved_at?: string | null;
  unipile_response?: any;
}

interface LeadActionsProps {
  lead: Lead;
  onAction: (actionName: string) => void;
  onSendLinkedInMessage?: () => void;
  messageSending?: boolean;
  message?: string;
  onPhoneRetrieved?: (phoneNumber: string | null) => void;
}

const LeadActions = ({ 
  lead, 
  onAction,
  onSendLinkedInMessage,
  messageSending = false,
  message = '',
  onPhoneRetrieved
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

  const canSendMessage = onSendLinkedInMessage && message.trim().length > 0 && message.length <= 300;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
      
      {/* Actions verticales */}
      <div className="space-y-3">
        {/* LinkedIn Message */}
        {onSendLinkedInMessage && (
          <Button
            onClick={onSendLinkedInMessage}
            disabled={!canSendMessage || messageSending}
            className="w-full flex items-center gap-2"
            size="sm"
          >
            <Send className="h-4 w-4" />
            {messageSending ? 'Envoi...' : 'Envoyer message LinkedIn'}
          </Button>
        )}
        
        {/* Phone retrieval */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('phone')}
          className="w-full flex items-center gap-2"
          disabled={phoneLoading}
        >
          <Phone className="h-4 w-4" />
          {phoneLoading ? 'Recherche...' : 'Récupérer téléphone'}
        </Button>
        
        {/* Schedule reminder */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('reminder')}
          className="w-full flex items-center gap-2"
        >
          <UserCheck className="h-4 w-4" />
          Planifier rappel
        </Button>
        
        {/* HR Provider */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('hr_provider')}
          className="w-full flex items-center gap-2"
        >
          <Building2 className="h-4 w-4" />
          Prestataire RH
        </Button>
        
        {/* Profile link */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(lead.author_profile_url, '_blank')}
          className="w-full flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Voir profil LinkedIn
        </Button>
      </div>

      {/* Phone number display */}
      {lead.phone_number && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          <strong>Téléphone:</strong> {lead.phone_number}
        </div>
      )}

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
