
import React, { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import LeadDetailHeader from './LeadDetailHeader';
import SimplifiedLeadView from './SimplifiedLeadView';
import SystemStatus from '../SystemStatus';

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
  const [currentLeads, setCurrentLeads] = useState(leads);

  // Synchroniser les leads avec les props
  React.useEffect(() => {
    setCurrentLeads(leads);
  }, [leads]);

  // Définir les fonctions de navigation
  const handlePrevious = () => {
    if (selectedLeadIndex !== null && selectedLeadIndex > 0) {
      onNavigateToLead(selectedLeadIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedLeadIndex !== null && selectedLeadIndex < currentLeads.length - 1) {
      onNavigateToLead(selectedLeadIndex + 1);
    }
  };

  // Keyboard shortcuts pour la navigation dans le dialog
  useKeyboardShortcuts({
    onNextItem: handleNext,
    onPreviousItem: handlePrevious,
    onEscape: onClose,
    enabled: isOpen
  });

  // Touch gestures pour la navigation dans le dialog
  useTouchGestures({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrevious,
    onSwipeUp: onClose,
    enabled: isOpen
  });

  // Maintenant on peut faire le return conditionnel APRÈS tous les hooks
  if (selectedLeadIndex === null || !currentLeads[selectedLeadIndex]) return null;

  const lead = currentLeads[selectedLeadIndex];
  const canGoPrevious = selectedLeadIndex > 0;
  const canGoNext = selectedLeadIndex < currentLeads.length - 1;

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      {/* Overlay épuré - moins visible */}
      <div className="fixed inset-0 z-50 bg-black/20 animate-in fade-in-0 duration-300" onClick={onClose} />
      
      {/* Fenêtre beaucoup plus grande - 95% largeur et 90% hauteur */}
      <div className="fixed left-[50%] top-[50%] z-50 w-[95vw] h-[90vh] max-w-[1600px] max-h-[1000px] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-2xl animate-in slide-in-from-top duration-300 ease-out flex flex-col">
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
        
        {/* System Status Banner */}
        <SystemStatus className="mx-6 mt-2 flex-shrink-0" />
        
        <div className="flex-1 overflow-hidden p-6">
          <SimplifiedLeadView lead={currentLeads[selectedLeadIndex]} />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default LeadDetailDialog;
