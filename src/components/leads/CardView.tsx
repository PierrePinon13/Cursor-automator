import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTimeAgo } from '@/utils/timeUtils';
import LeadDetailDialog from './LeadDetailDialog';

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

interface CardViewProps {
  leads: Lead[];
  onActionCompleted: () => void;
  selectedLeadIndex: number | null;
  onLeadSelect: (index: number | null) => void;
}

const CardView = ({ leads, onActionCompleted, selectedLeadIndex, onLeadSelect }: CardViewProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCardClick = (leadIndex: number, event: React.MouseEvent) => {
    // Ne pas ouvrir la dialog si on clique sur un lien
    if ((event.target as HTMLElement).closest('a, button, [data-clickable]')) {
      return;
    }
    onLeadSelect(leadIndex);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    onLeadSelect(null);
  };

  const handleNavigateToLead = (newIndex: number) => {
    onLeadSelect(newIndex);
  };

  const handleActionCompleted = () => {
    // Appeler la fonction de callback pour rafraîchir les données
    onActionCompleted();
    
    if (selectedLeadIndex !== null && selectedLeadIndex < leads.length - 1) {
      onLeadSelect(selectedLeadIndex + 1);
    } else {
      handleCloseDialog();
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {leads.map((lead, index) => (
          <div 
            key={lead.id} 
            className="bg-white rounded-xl border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 overflow-hidden"
            onClick={(event) => handleCardClick(index, event)}
          >
            {/* Header avec gradient subtil */}
            <div className="bg-gradient-to-r from-gray-50 to-white p-4 border-b border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-2 font-medium">
                    {getTimeAgo(lead.posted_at_iso || lead.created_at, lead.posted_at_timestamp)}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="text-xs px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                  >
                    {lead.openai_step3_categorie}
                  </Badge>
                </div>
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full font-medium">
                  {lead.openai_step2_localisation || 'France'}
                </span>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-2 text-gray-800">Profil recherché</h3>
                <div className="space-y-1">
                  {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
                    <div key={index} className="text-green-600 text-sm">
                      <span 
                        className="cursor-pointer hover:text-green-700 hover:underline inline-block font-medium"
                        data-clickable="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(lead.url, '_blank');
                        }}
                      >
                        {poste}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-1 text-gray-800">Lead</h4>
                <span 
                  className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline inline-block font-medium"
                  data-clickable="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(lead.author_profile_url, '_blank');
                  }}
                >
                  {lead.author_name || 'N/A'}
                </span>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-3 border border-gray-100">
                <h4 className="font-semibold text-sm mb-2 text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Entreprise
                </h4>
                {lead.unipile_company ? (
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-gray-900">{lead.unipile_company}</div>
                    {lead.unipile_position && (
                      <div className="text-sm text-gray-600">{lead.unipile_position}</div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-sm text-orange-600 font-medium">Données non disponibles</div>
                    <div className="text-xs text-gray-500 truncate">{lead.author_headline || 'N/A'}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <LeadDetailDialog 
        leads={leads}
        selectedLeadIndex={selectedLeadIndex}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onNavigateToLead={handleNavigateToLead}
        onActionCompleted={handleActionCompleted}
      />
    </>
  );
};

export default CardView;
