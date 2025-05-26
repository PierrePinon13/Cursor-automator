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
}

interface CardViewProps {
  leads: Lead[];
}

const CardView = ({ leads }: CardViewProps) => {
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCardClick = (leadIndex: number, event: React.MouseEvent) => {
    // Ne pas ouvrir la dialog si on clique sur un lien
    if ((event.target as HTMLElement).closest('a, button, [data-clickable]')) {
      return;
    }
    setSelectedLeadIndex(leadIndex);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedLeadIndex(null);
  };

  const handleNavigateToLead = (newIndex: number) => {
    setSelectedLeadIndex(newIndex);
  };

  const handleActionCompleted = () => {
    if (selectedLeadIndex !== null && selectedLeadIndex < leads.length - 1) {
      setSelectedLeadIndex(selectedLeadIndex + 1);
    } else {
      handleCloseDialog();
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {leads.map((lead, index) => (
          <div 
            key={lead.id} 
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={(event) => handleCardClick(index, event)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">
                  {getTimeAgo(lead.posted_at_iso || lead.created_at, lead.posted_at_timestamp)}
                </div>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {lead.openai_step3_categorie}
                </Badge>
              </div>
              <span className="text-xs text-gray-600">
                {lead.openai_step2_localisation || 'France'}
              </span>
            </div>

            <div className="mb-3">
              <h3 className="font-medium text-sm mb-1">Profil recherché</h3>
              {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
                <div key={index} className="text-green-600 text-xs">
                  <span 
                    className="cursor-pointer hover:text-green-700 hover:underline inline-block"
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

            <div className="mb-3">
              <h4 className="font-medium text-xs mb-0.5">Lead</h4>
              <span 
                className="text-xs text-gray-700 cursor-pointer hover:text-blue-700 hover:underline inline-block"
                data-clickable="true"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(lead.author_profile_url, '_blank');
                }}
              >
                {lead.author_name || 'N/A'}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <h4 className="font-medium text-xs mb-1">Entreprise</h4>
              {lead.unipile_company ? (
                <div>
                  <div className="font-medium text-xs">{lead.unipile_company}</div>
                  {lead.unipile_position && (
                    <div className="text-xs text-gray-600">{lead.unipile_position}</div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  <div>Données non disponibles</div>
                  <div className="text-xs text-gray-400 truncate">{lead.author_headline || 'N/A'}</div>
                </div>
              )}
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
