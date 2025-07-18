
import React, { useState, useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import LeadDetailHeader from './LeadDetailHeader';
import LeadDetailContent from './LeadDetailContent';
import RecentContactWarning from './RecentContactWarning';

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
  const [recentContactWarning, setRecentContactWarning] = useState<{
    show: boolean;
    contactedBy?: string;
    hoursAgo?: number;
    lastContactAt?: string;
  }>({
    show: false
  });

  const {
    sendMessage,
    loading: messageSending
  } = useLinkedInMessage();
  const {
    toast
  } = useToast();

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
  
  const handleClose = () => {
    onClose();
  };

  // Keyboard shortcuts pour la navigation dans le dialog
  useKeyboardShortcuts({
    onNextItem: handleNext,
    onPreviousItem: handlePrevious,
    onEscape: handleClose,
    enabled: isOpen
  });

  // Touch gestures pour la navigation dans le dialog
  useTouchGestures({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrevious,
    onSwipeUp: handleClose,
    enabled: isOpen
  });

  const handleSendLinkedInMessage = async () => {
    if (selectedLeadIndex === null || !currentLeads[selectedLeadIndex]) return;
    const lead = currentLeads[selectedLeadIndex];
    
    if (!customMessage.trim()) {
      toast({
        title: "Erreur",
        description: "Le message ne peut pas être vide",
        variant: "destructive"
      });
      return;
    }
    
    if (customMessage.length > 300) {
      toast({
        title: "Erreur",
        description: "Le message dépasse la limite de 300 caractères",
        variant: "destructive"
      });
      return;
    }

    const success = await sendMessage(lead.id, customMessage, {
      author_name: lead.author_name,
      author_profile_url: lead.author_profile_url
    });
    
    if (success) {
      onActionCompleted();
      toast({
        title: "Message envoyé",
        description: "Votre message LinkedIn a été envoyé avec succès"
      });
    }
  };

  const handleAction = async (actionName: string) => {
    if (selectedLeadIndex === null || !currentLeads[selectedLeadIndex]) return;
    const lead = currentLeads[selectedLeadIndex];
    
    try {
      switch (actionName) {
        case 'positive_call':
          await supabase.from('leads').update({
            phone_contact_status: 'positive',
            phone_contact_at: new Date().toISOString(),
            last_updated_at: new Date().toISOString()
          }).eq('id', lead.id);
          toast({
            title: "Succès",
            description: "Appel positif enregistré"
          });
          break;
        case 'negative_call':
          await supabase.from('leads').update({
            phone_contact_status: 'negative',
            phone_contact_at: new Date().toISOString(),
            last_updated_at: new Date().toISOString()
          }).eq('id', lead.id);
          toast({
            title: "Succès",
            description: "Appel négatif enregistré"
          });
          break;
        case 'message_sent':
          // Marquer le message comme envoyé
          await supabase.from('leads').update({
            linkedin_message_sent_at: new Date().toISOString(),
            last_contact_at: new Date().toISOString(),
            last_updated_at: new Date().toISOString()
          }).eq('id', lead.id);
          break;
      }
      onActionCompleted();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le lead",
        variant: "destructive"
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

  // Protection contre les états invalides
  if (!isOpen || selectedLeadIndex === null || !currentLeads[selectedLeadIndex]) {
    return null;
  }

  const lead = currentLeads[selectedLeadIndex];
  const canGoPrevious = selectedLeadIndex > 0;
  const canGoNext = selectedLeadIndex < currentLeads.length - 1;

  const showRecentContactWarning = recentContactWarning.show;
  const showContent = !showRecentContactWarning;

  return (
    <TooltipProvider>
      {/* Overlay noir semi-transparent */}
      <div className="fixed inset-0 z-50 bg-black/40 animate-in fade-in-0 duration-500" onClick={handleClose} />
      
      {/* Interface plein écran avec animation depuis le haut */}
      <div className="fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-700 ease-out translate-y-0 animate-in slide-in-from-top duration-700">
        <LeadDetailHeader 
          lead={lead} 
          selectedLeadIndex={selectedLeadIndex} 
          totalLeads={currentLeads.length} 
          canGoPrevious={canGoPrevious} 
          canGoNext={canGoNext} 
          onPrevious={handlePrevious} 
          onNext={handleNext} 
          onClose={handleClose} 
        />
        
        <div className="flex-1 overflow-hidden">
          {/* Affichage conditionnel des warnings */}
          {showRecentContactWarning && (
            <RecentContactWarning 
              contactedBy={recentContactWarning.contactedBy} 
              hoursAgo={recentContactWarning.hoursAgo}
              lastContactAt={recentContactWarning.lastContactAt}
              onClose={() => setRecentContactWarning({ show: false })}
              onContinueAnyway={() => setRecentContactWarning({ show: false })}
            />
          )}
          
          {/* Afficher le contenu principal */}
          {showContent && (
            <LeadDetailContent 
              lead={lead} 
              onActionCompleted={onActionCompleted} 
              customMessage={customMessage} 
              onMessageChange={setCustomMessage} 
              onSendLinkedInMessage={handleSendLinkedInMessage} 
              onAction={handleAction} 
              messageSending={messageSending} 
              onPhoneRetrieved={handlePhoneRetrieved} 
              onContactUpdate={handleContactUpdate} 
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default LeadDetailDialog;
