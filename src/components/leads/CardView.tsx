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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCardClick = (lead: Lead, event: React.MouseEvent) => {
    // Ne pas ouvrir la dialog si on clique sur un lien
    if ((event.target as HTMLElement).closest('a, button')) {
      return;
    }
    setSelectedLead(lead);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedLead(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {leads.map((lead) => (
          <div 
            key={lead.id} 
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={(event) => handleCardClick(lead, event)}
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
              <div 
                className="group cursor-pointer hover:bg-blue-50 rounded-md p-2 -m-2 transition-all duration-200"
                onClick={() => window.open(lead.url, '_blank')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm mb-1 group-hover:text-blue-700">Profil recherché</h3>
                    {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
                      <div key={index} className="text-green-600 text-xs group-hover:text-green-700">
                        {poste}
                      </div>
                    ))}
                  </div>
                  <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0 mt-1" />
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div 
                className="group cursor-pointer hover:bg-blue-50 rounded-md p-2 -m-2 transition-all duration-200"
                onClick={() => window.open(lead.author_profile_url, '_blank')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-xs mb-0.5 group-hover:text-blue-700">Lead</h4>
                    <span className="text-xs text-gray-700">
                      {lead.author_name || 'N/A'}
                    </span>
                  </div>
                  <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0" />
                </div>
              </div>
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
        lead={selectedLead}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
      />
    </>
  );
};

export default CardView;
