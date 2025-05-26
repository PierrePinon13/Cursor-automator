import React, { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';
import LeadDetailHeader from './LeadDetailHeader';
import LeadDetailContent from './LeadDetailContent';

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
  const [currentLeads, setCurrentLeads] = useState(leads);
  const { sendMessage, loading: messageSending } = useLinkedInMessage();

  // Synchroniser les leads avec les props
  React.useEffect(() => {
    setCurrentLeads(leads);
  }, [leads]);

  if (selectedLeadIndex === null || !currentLeads[selectedLeadIndex]) return null;

  const lead = currentLeads[selectedLeadIndex];
  const canGoPrevious = selectedLeadIndex > 0;
  const canGoNext = selectedLeadIndex < currentLeads.length - 1;

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
    const messageToSend = customMessage.trim();
    
    if (!messageToSend) {
      console.error('No message to send');
      return;
    }
    
    if (messageToSend.length > 300) {
      console.error('Message too long');
      return;
    }
    
    const success = await sendMessage(lead.id, messageToSend);
    if (success) {
      // Update local lead with LinkedIn message timestamp
      const updatedLeads = [...currentLeads];
      updatedLeads[selectedLeadIndex] = {
        ...updatedLeads[selectedLeadIndex],
        linkedin_message_sent_at: new Date().toISOString(),
        last_contact_at: new Date().toISOString()
      };
      setCurrentLeads(updatedLeads);
      
      onActionCompleted();
      setCustomMessage('');
    }
  };

  const handlePhoneRetrieved = (phoneNumber: string | null) => {
    // Mettre à jour le lead local avec le nouveau numéro de téléphone
    const updatedLeads = [...currentLeads];
    updatedLeads[selectedLeadIndex] = {
      ...updatedLeads[selectedLeadIndex],
      phone_number: phoneNumber,
      phone_retrieved_at: new Date().toISOString()
    };
    setCurrentLeads(updatedLeads);
  };

  const handleContactUpdate = () => {
    // Callback pour mettre à jour les données du lead après un contact téléphonique
    const updatedLeads = [...currentLeads];
    updatedLeads[selectedLeadIndex] = {
      ...updatedLeads[selectedLeadIndex],
      phone_contact_at: new Date().toISOString(),
      last_contact_at: new Date().toISOString()
    };
    setCurrentLeads(updatedLeads);
    onActionCompleted();
  };

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/80 animate-in fade-in-0 duration-200" onClick={onClose} />
      
      {/* Fullscreen sliding view */}
      <div className="fixed inset-0 z-50 bg-white animate-in slide-in-from-top duration-300 ease-out">
        <LeadDetailHeader
          lead={currentLeads[selectedLeadIndex]}
          selectedLeadIndex={selectedLeadIndex}
          totalLeads={currentLeads.length}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onClose={onClose}
        />
        
        <LeadDetailContent
          lead={currentLeads[selectedLeadIndex]}
          customMessage={customMessage}
          onMessageChange={setCustomMessage}
          onSendLinkedInMessage={handleSendLinkedInMessage}
          onAction={handleAction}
          messageSending={messageSending}
          onPhoneRetrieved={handlePhoneRetrieved}
          onContactUpdate={handleContactUpdate}
        />
      </div>
    </TooltipProvider>
  );
};

export default LeadDetailDialog;
