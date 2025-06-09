import React, { useState, useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { useToast } from '@/hooks/use-toast';
import { useLeadLocking } from '@/hooks/useLeadLocking';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import LeadDetailHeader from './LeadDetailHeader';
import LeadDetailContent from './LeadDetailContent';
import LeadLockWarning from './LeadLockWarning';
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
  const [isLocked, setIsLocked] = useState(false);
  const [lockWarning, setLockWarning] = useState<{
    show: boolean;
    lockedByUserName?: string;
    hoursAgo?: number;
  }>({ show: false });
  const [recentContactWarning, setRecentContactWarning] = useState<{
    show: boolean;
    contactedBy?: string;
    hoursAgo?: number;
    lastContactAt?: string;
  }>({ show: false });

  const { sendMessage, loading: messageSending } = useLinkedInMessage();
  const { lockLead, unlockLead, checkRecentContact, setupLockMaintenance } = useLeadLocking();
  const { toast } = useToast();

  // Synchroniser les leads avec les props
  React.useEffect(() => {
    setCurrentLeads(leads);
  }, [leads]);

  // Gérer le verrouillage lors de l'ouverture d'un lead
  useEffect(() => {
    if (selectedLeadIndex !== null && currentLeads[selectedLeadIndex] && isOpen) {
      const lead = currentLeads[selectedLeadIndex];
      
      const handleLeadLocking = async () => {
        try {
          const lockResult = await lockLead(lead.id);
          
          if (lockResult.isLocked) {
            setLockWarning({
              show: true,
              lockedByUserName: lockResult.lockedByUserName,
              hoursAgo: lockResult.hoursAgo
            });
            setIsLocked(false);
          } else {
            setIsLocked(true);
            setLockWarning({ show: false });
            
            // Configurer la maintenance du verrou avec heartbeat
            const cleanup = setupLockMaintenance(lead.id);
            return cleanup;
          }
        } catch (error) {
          console.error('Error locking lead:', error);
          toast({
            title: "Erreur",
            description: "Impossible de verrouiller le lead",
            variant: "destructive",
          });
        }
      };

      handleLeadLocking();
    }
  }, [selectedLeadIndex, currentLeads, isOpen, lockLead, setupLockMaintenance, toast]);

  // Déverrouiller lors de la fermeture
  useEffect(() => {
    return () => {
      if (selectedLeadIndex !== null && currentLeads[selectedLeadIndex] && isLocked) {
        unlockLead(currentLeads[selectedLeadIndex].id);
      }
    };
  }, [selectedLeadIndex, currentLeads, isLocked, unlockLead]);

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

  const handleClose = async () => {
    if (selectedLeadIndex !== null && currentLeads[selectedLeadIndex] && isLocked) {
      await unlockLead(currentLeads[selectedLeadIndex].id);
    }
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
        variant: "destructive",
      });
      return;
    }

    if (customMessage.length > 300) {
      toast({
        title: "Erreur",
        description: "Le message dépasse la limite de 300 caractères",
        variant: "destructive",
      });
      return;
    }

    // Vérifier les contacts récents avant d'envoyer
    const recentContactCheck = await checkRecentContact(lead.id);
    if (recentContactCheck.hasRecentContact) {
      setRecentContactWarning({
        show: true,
        contactedBy: recentContactCheck.contactedBy,
        hoursAgo: recentContactCheck.hoursAgo,
        lastContactAt: recentContactCheck.lastContactAt
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
        description: "Votre message LinkedIn a été envoyé avec succès",
      });
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

        case 'message_sent':
          // Marquer le message comme envoyé
          await supabase
            .from('leads')
            .update({
              linkedin_message_sent_at: new Date().toISOString(),
              last_contact_at: new Date().toISOString(),
              last_updated_at: new Date().toISOString()
            })
            .eq('id', lead.id);
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
      <div className="fixed inset-0 z-50 bg-black/40 animate-in fade-in-0 duration-500" onClick={handleClose} />
      
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
          onClose={handleClose}
        />
        
        <div className="flex-1 overflow-hidden">
          <div className="p-6">
            {/* Afficher les avertissements */}
            {lockWarning.show && (
              <LeadLockWarning
                lockedByUserName={lockWarning.lockedByUserName || 'Utilisateur inconnu'}
                hoursAgo={lockWarning.hoursAgo}
                onClose={() => setLockWarning({ show: false })}
              />
            )}
            
            {recentContactWarning.show && (
              <RecentContactWarning
                contactedBy={recentContactWarning.contactedBy || 'Utilisateur inconnu'}
                hoursAgo={recentContactWarning.hoursAgo || 0}
                lastContactAt={recentContactWarning.lastContactAt || ''}
              />
            )}
          </div>
          
          {/* Afficher le contenu seulement si le lead est disponible */}
          {(isLocked || (!lockWarning.show && !recentContactWarning.show)) && (
            <LeadDetailContent
              lead={currentLeads[selectedLeadIndex]}
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
