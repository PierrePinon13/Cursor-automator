
import React, { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import LeadDetailHeader from './LeadDetailHeader';
import LeadDetailContent from './LeadDetailContent';
import SystemStatus from '../SystemStatus';

type Lead = Tables<'leads'>;

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
  const [customMessage, setCustomMessage] = useState('');
  const { sendMessage, loading: messageSending } = useLinkedInMessage();
  const { toast } = useToast();

  // Synchroniser les leads avec les props
  React.useEffect(() => {
    setCurrentLeads(leads);
  }, [leads]);

  // Initialiser le message personnalisé quand le lead change
  React.useEffect(() => {
    if (selectedLeadIndex !== null && currentLeads[selectedLeadIndex]) {
      const lead = currentLeads[selectedLeadIndex];
      if (lead.approach_message) {
        setCustomMessage(lead.approach_message);
      } else {
        setCustomMessage('');
      }
    }
  }, [selectedLeadIndex, currentLeads]);

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

  const handleSendLinkedInMessage = async () => {
    if (selectedLeadIndex === null || !currentLeads[selectedLeadIndex]) return;
    
    const lead = currentLeads[selectedLeadIndex];
    const success = await sendMessage(lead.id, customMessage);
    
    if (success) {
      onActionCompleted();
    }
  };

  const handleAction = async (actionName: string) => {
    if (selectedLeadIndex === null || !currentLeads[selectedLeadIndex]) return;
    
    const lead = currentLeads[selectedLeadIndex];
    
    try {
      switch (actionName) {
        case 'positive_call':
          await supabase
            .from('leads')
            .update({
              phone_contact_status: 'positive',
              phone_contact_at: new Date().toISOString(),
              last_updated_at: new Date().toISOString()
            })
            .eq('id', lead.id);
          
          toast({
            title: "Succès",
            description: "Appel positif enregistré",
          });
          break;
          
        case 'negative_call':
          await supabase
            .from('leads')
            .update({
              phone_contact_status: 'negative',
              phone_contact_at: new Date().toISOString(),
              last_updated_at: new Date().toISOString()
            })
            .eq('id', lead.id);
          
          toast({
            title: "Succès",
            description: "Appel négatif enregistré",
          });
          break;
      }
      
      onActionCompleted();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le lead",
        variant: "destructive",
      });
    }
  };

  const handlePhoneRetrieved = (phoneNumber: string | null) => {
    // Mise à jour du lead local si nécessaire
    if (selectedLeadIndex !== null) {
      const updatedLeads = [...currentLeads];
      updatedLeads[selectedLeadIndex] = {
        ...updatedLeads[selectedLeadIndex],
        phone_number: phoneNumber,
        phone_retrieved_at: phoneNumber ? new Date().toISOString() : null
      };
      setCurrentLeads(updatedLeads);
    }
  };

  const handleContactUpdate = () => {
    onActionCompleted();
  };

  // Maintenant on peut faire le return conditionnel APRÈS tous les hooks
  if (selectedLeadIndex === null || !currentLeads[selectedLeadIndex]) return null;

  const lead = currentLeads[selectedLeadIndex];
  const canGoPrevious = selectedLeadIndex > 0;
  const canGoNext = selectedLeadIndex < currentLeads.length - 1;

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      {/* Overlay noir semi-transparent */}
      <div className="fixed inset-0 z-50 bg-black/40 animate-in fade-in-0 duration-500" onClick={onClose} />
      
      {/* Interface plein écran avec animation depuis le haut */}
      <div className={`fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-700 ease-out ${
        isOpen ? 'translate-y-0' : '-translate-y-full'
      } animate-in slide-in-from-top duration-700`}>
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
        
        <div className="flex-1 overflow-hidden">
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
      </div>
    </TooltipProvider>
  );
};

export default LeadDetailDialog;
