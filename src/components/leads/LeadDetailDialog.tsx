
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';
import LeadDetailNavigation from './LeadDetailNavigation';
import LeadDetailLayout from './LeadDetailLayout';
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
}

interface LeadDetailDialogProps {
  leads: Lead[];
  selectedLeadIndex: number | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToLead: (index: number) => void;
  onActionCompleted: () => void;
}

const LeadDetailDialog = ({ 
  leads, 
  selectedLeadIndex, 
  isOpen, 
  onClose, 
  onNavigateToLead, 
  onActionCompleted 
}: LeadDetailDialogProps) => {
  const [customMessage, setCustomMessage] = useState('');
  const { sendMessage, loading: messageSending } = useLinkedInMessage();

  if (selectedLeadIndex === null || !leads[selectedLeadIndex]) return null;

  const lead = leads[selectedLeadIndex];
  const canGoPrevious = selectedLeadIndex > 0;
  const canGoNext = selectedLeadIndex < leads.length - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onNavigateToLead(selectedLeadIndex - 1);
      setCustomMessage('');
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onNavigateToLead(selectedLeadIndex + 1);
      setCustomMessage('');
    }
  };

  const handleAction = (actionName: string) => {
    console.log(`Action ${actionName} executée pour le lead ${lead.author_name}`);
    onActionCompleted();
  };

  const handleSendLinkedInMessage = async () => {
    let profileId = '';
    if (lead.author_profile_url) {
      const match = lead.author_profile_url.match(/\/in\/([^\/]+)/);
      if (match) {
        profileId = match[1];
      }
    }

    if (!profileId) {
      console.error('Could not determine profile ID for lead');
      return;
    }

    const messageToSend = customMessage.trim();
    if (!messageToSend) {
      console.error('No message to send');
      return;
    }
    
    const success = await sendMessage(profileId, messageToSend);
    if (success) {
      onActionCompleted();
      setCustomMessage('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle asChild>
            <LeadDetailNavigation
              currentIndex={selectedLeadIndex}
              totalLeads={leads.length}
              canGoPrevious={canGoPrevious}
              canGoNext={canGoNext}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          </DialogTitle>
        </DialogHeader>
        
        <LeadDetailLayout
          leftPanel={<LeadInfo lead={lead} />}
          centerPanel={
            <LeadMessageEditor
              lead={lead}
              message={customMessage}
              onMessageChange={setCustomMessage}
              disabled={messageSending}
            />
          }
          rightPanel={
            <LeadActions
              lead={lead}
              onSendLinkedInMessage={handleSendLinkedInMessage}
              onAction={handleAction}
              messageSending={messageSending}
              hasMessage={customMessage.trim().length > 0}
            />
          }
        />
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailDialog;
