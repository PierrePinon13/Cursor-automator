
import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { X, Linkedin } from 'lucide-react';
import { useLinkedInMessage } from '@/hooks/useLinkedInMessage';
import LeadDetailNavigation from './LeadDetailNavigation';
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
      onActionCompleted();
      setCustomMessage('');
    }
  };

  const handlePhoneRetrieved = () => {
    onActionCompleted();
  };

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/80 animate-in fade-in-0 duration-200" onClick={onClose} />
      
      {/* Fullscreen sliding view */}
      <div className="fixed inset-0 z-50 bg-white animate-in slide-in-from-top duration-300 ease-out">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
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
            
            <div className="flex items-center gap-4">
              <LeadDetailNavigation
                currentIndex={selectedLeadIndex}
                totalLeads={leads.length}
                canGoPrevious={canGoPrevious}
                canGoNext={canGoNext}
                onPrevious={handlePrevious}
                onNext={handleNext}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Content - Three equal columns */}
        <div className="flex h-[calc(100vh-88px)]">
          {/* Section gauche - Insights du lead */}
          <div className="w-1/3 border-r border-gray-200 bg-gray-50/30 h-full overflow-hidden">
            <div className="p-6 h-full">
              <LeadInfo lead={lead} />
            </div>
          </div>

          {/* Section milieu - Message pré-rédigé */}
          <div className="w-1/3 border-r border-gray-200 bg-white h-full overflow-hidden">
            <div className="p-6 h-full">
              <LeadMessageEditor
                lead={lead}
                message={customMessage}
                onMessageChange={setCustomMessage}
                disabled={messageSending}
              />
            </div>
          </div>

          {/* Section droite - Boutons d'actions */}
          <div className="w-1/3 bg-white h-full overflow-hidden">
            <div className="p-6 h-full">
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
        </div>
      </div>
    </TooltipProvider>
  );
};

export default LeadDetailDialog;
