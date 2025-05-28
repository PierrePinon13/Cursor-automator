
import React from 'react';
import LeadInfo from './LeadInfo';
import LeadMessageEditor from './LeadMessageEditor';
import LeadActions from './LeadActions';

interface Lead {
  id: string;
  created_at: string;
  author_name: string;
  author_headline: string;
  author_profile_url: string;
  text: string;
  title: string;
  url: string;
  posted_at_iso: string;
  posted_at_timestamp: number;
  openai_step2_localisation: string;
  openai_step3_categorie: string;
  openai_step3_postes_selectionnes: string[];
  openai_step3_justification: string;
  unipile_company: string;
  unipile_position: string;
  unipile_profile_scraped: boolean;
  unipile_profile_scraped_at: string;
  phone_number?: string | null;
  phone_retrieved_at?: string | null;
  approach_message?: string | null;
  approach_message_generated?: boolean | null;
  approach_message_generated_at?: string | null;
  is_client_lead?: boolean | null;
  matched_client_name?: string | null;
  matched_client_id?: string | null;
  last_contact_at?: string | null;
  linkedin_message_sent_at?: string | null;
  phone_contact_status?: string | null;
  phone_contact_at?: string | null;
  last_updated_at?: string | null;
}

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
          <LeadMessageEditor
            lead={lead}
            message={customMessage}
            onMessageChange={onMessageChange}
            disabled={messageSending}
          />
        </div>
      </div>

      {/* Section droite - Boutons d'actions */}
      <div className="w-1/3 bg-white h-full overflow-hidden">
        <div className="p-6 h-full overflow-y-auto">
          <LeadActions
            lead={lead}
            onSendLinkedInMessage={onSendLinkedInMessage}
            onAction={onAction}
            messageSending={messageSending}
            message={customMessage}
            onPhoneRetrieved={onPhoneRetrieved}
            onContactUpdate={onContactUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default LeadDetailContent;
