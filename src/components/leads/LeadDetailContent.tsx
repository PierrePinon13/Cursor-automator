
import React from 'react';
import { Tables } from '@/integrations/supabase/types';
import LeadInfo from './LeadInfo';
import LeadMessageSection from './LeadMessageSection';
import LeadActionsSection from './LeadActionsSection';

type Lead = Tables<'leads'>;

interface LeadDetailContentProps {
  lead: Lead;
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
      {/* Section gauche - Insights du lead */}
      <div className="w-1/3 border-r border-gray-200 bg-gray-50/30 h-full overflow-hidden">
        <div className="p-6 h-full overflow-y-auto">
          <LeadInfo lead={lead} />
        </div>
      </div>

      {/* Section milieu - Message pré-rédigé */}
      <div className="w-1/3 border-r border-gray-200 bg-white h-full overflow-hidden">
        <div className="p-6 h-full overflow-y-auto">
          <LeadMessageSection
            lead={lead}
            customMessage={customMessage}
            onMessageChange={onMessageChange}
          />
        </div>
      </div>

      {/* Section droite - Actions */}
      <div className="w-1/3 bg-white h-full overflow-hidden">
        <div className="p-6 h-full overflow-y-auto">
          <LeadActionsSection
            lead={lead}
            onAction={onAction}
            onSendLinkedInMessage={onSendLinkedInMessage}
            messageSending={messageSending}
            customMessage={customMessage}
            onPhoneRetrieved={onPhoneRetrieved}
            onContactUpdate={onContactUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default LeadDetailContent;
