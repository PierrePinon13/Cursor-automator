
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tables } from '@/integrations/supabase/types';
import LeadPostContent from './LeadPostContent';
import LeadProfileInfo from './LeadProfileInfo';
import LeadActionPanel from './LeadActionPanel';
import ClientHistoryAlert from './ClientHistoryAlert';

type Lead = Tables<'leads'>;

interface LeadDetailContentProps {
  lead: Lead;
  onActionCompleted: () => void;
  customMessage: string;
  onMessageChange: (message: string) => void;
  onSendLinkedInMessage: () => void;
  onAction: (actionName: string) => void;
  messageSending: boolean;
  onPhoneRetrieved: (phoneNumber: string | null) => void;
  onContactUpdate: () => void;
}

const LeadDetailContent = ({
  lead,
  onActionCompleted,
  customMessage,
  onMessageChange,
  onSendLinkedInMessage,
  onAction,
  messageSending,
  onPhoneRetrieved,
  onContactUpdate
}: LeadDetailContentProps) => {
  return (
    <div className="flex h-full">
      {/* Contenu principal - 2/3 de la largeur */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Alerte historique client */}
            <ClientHistoryAlert lead={lead} />

            {/* Contenu du post */}
            <LeadPostContent lead={lead} />
            
            {/* Informations du profil */}
            <LeadProfileInfo lead={lead} />
          </div>
        </ScrollArea>
      </div>

      {/* Panel d'actions - 1/3 de la largeur */}
      <div className="w-1/3 border-l bg-gray-50/50">
        <LeadActionPanel
          lead={lead}
          customMessage={customMessage}
          onMessageChange={onMessageChange}
          onSendLinkedInMessage={onSendLinkedInMessage}
          onAction={onAction}
          messageSending={messageSending}
          onPhoneRetrieved={onPhoneRetrieved}
          onContactUpdate={onContactUpdate}
          onActionCompleted={onActionCompleted}
        />
      </div>
    </div>
  );
};

export default LeadDetailContent;
