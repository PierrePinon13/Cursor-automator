
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';
import { Linkedin } from 'lucide-react';
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
  phone_number?: string | null;
  phone_retrieved_at?: string | null;
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

  // Vérifier si le message est valide (longueur et contenu)
  const isMessageValid = customMessage.trim().length > 0 && customMessage.length <= 300;

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
    
    // Vérification de la longueur du message
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
      onActionCompleted();
      setCustomMessage('');
    }
  };

  const handlePhoneRetrieved = () => {
    // Rafraîchir les données du lead après récupération du téléphone
    onActionCompleted();
  };

  const formatCompanyInfo = () => {
    if (lead.unipile_company && lead.unipile_position) {
      return `${lead.unipile_position} @ ${lead.unipile_company}`;
    } else if (lead.unipile_company) {
      return `@ ${lead.unipile_company}`;
    } else if (lead.unipile_position) {
      return lead.unipile_position;
    } else if (lead.author_headline) {
      return lead.author_headline;
    }
    return 'Informations non disponibles';
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0 bg-white">
          <DialogHeader className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg text-gray-800">{lead.author_name || 'N/A'}</h3>
                    <a
                      href={lead.author_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 transition-colors hover:scale-110 transform duration-200"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="text-sm text-gray-600">
                    {lead.unipile_position && (
                      <span>{lead.unipile_position}</span>
                    )}
                    {lead.unipile_position && lead.unipile_company && <span> @ </span>}
                    {lead.unipile_company && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help hover:text-blue-600 transition-colors">
                            {lead.unipile_company}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 rounded-lg shadow-lg">
                          <p className="text-sm">
                            {lead.author_headline || "Description de l'activité non disponible"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
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
          
          <div className="flex h-[calc(95vh-80px)]">
            {/* Section gauche - Insights du lead (sans scroll global) */}
            <div className="w-1/3 border-r border-gray-200 bg-gray-50/30 flex flex-col">
              <div className="p-6 flex-1 flex flex-col">
                <LeadInfo lead={lead} />
              </div>
            </div>

            {/* Section milieu - Message pré-rédigé */}
            <div className="w-1/3 p-6 border-r border-gray-200 overflow-y-auto bg-white">
              <LeadMessageEditor
                lead={lead}
                message={customMessage}
                onMessageChange={setCustomMessage}
                disabled={messageSending}
              />
            </div>

            {/* Section droite - Boutons d'actions */}
            <div className="w-1/3 p-6 overflow-y-auto bg-white">
              <LeadActions
                lead={lead}
                onSendLinkedInMessage={handleSendLinkedInMessage}
                onAction={handleAction}
                messageSending={messageSending}
                message={customMessage}
                onPhoneRetrieved={handlePhoneRetrieved}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default LeadDetailDialog;
