
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, UserCheck, Phone, ExternalLink } from 'lucide-react';
import { HrProviderSelector } from './HrProviderSelector';

interface Lead {
  id: string;
  author_name: string;
  author_profile_url: string;
  unipile_response?: any;
}

interface LeadActionsProps {
  lead: Lead;
  onAction: (actionName: string) => void;
}

const LeadActions = ({ lead, onAction }: LeadActionsProps) => {
  const [showHrProviderSelector, setShowHrProviderSelector] = useState(false);

  const handleAction = (actionName: string) => {
    if (actionName === 'hr_provider') {
      setShowHrProviderSelector(true);
      return;
    }
    onAction(actionName);
  };

  const handleHrProviderSelected = (hrProviderId: string) => {
    console.log(`HR Provider ${hrProviderId} selected for lead ${lead.id}`);
    onAction('hr_provider_assigned');
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
      
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('client')}
          className="flex items-center gap-2 text-xs"
        >
          <Building2 className="h-3 w-3" />
          Client
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('hr_provider')}
          className="flex items-center gap-2 text-xs"
        >
          <UserCheck className="h-3 w-3" />
          Prestataire RH
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('phone')}
          className="flex items-center gap-2 text-xs"
        >
          <Phone className="h-3 w-3" />
          Téléphone
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(lead.author_profile_url, '_blank')}
          className="flex items-center gap-2 text-xs"
        >
          <ExternalLink className="h-3 w-3" />
          Profil
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
