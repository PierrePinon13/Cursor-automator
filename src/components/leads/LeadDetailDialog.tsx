
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';
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
      setCustomMessage(''); // Reset message when navigating
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onNavigateToLead(selectedLeadIndex + 1);
      setCustomMessage(''); // Reset message when navigating
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
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Détails du Lead ({selectedLeadIndex + 1}/{leads.length})
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!canGoNext}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex h-[calc(90vh-120px)]">
          {/* Section gauche - Synthèse du lead */}
          <div className="w-1/3 p-6 border-r bg-gray-50 overflow-y-auto">
            <LeadInfo lead={lead} />
          </div>

          {/* Section milieu - Message pré-rédigé */}
          <div className="w-1/3 p-6 border-r overflow-y-auto">
            <LeadMessageEditor
              lead={lead}
              message={customMessage}
              onMessageChange={setCustomMessage}
              disabled={messageSending}
            />
          </div>

          {/* Section droite - Boutons d'actions */}
          <div className="w-1/3 p-6 overflow-y-auto">
            <LeadActions
              lead={lead}
              onSendLinkedInMessage={handleSendLinkedInMessage}
              onAction={handleAction}
              messageSending={messageSending}
              hasMessage={customMessage.trim().length > 0}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailDialog;
