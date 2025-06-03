
import React, { useState } from 'react';
import { ExternalLink, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTimeAgo } from '@/utils/timeUtils';
import LeadDetailDialog from './LeadDetailDialog';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

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
            className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5 overflow-hidden"
            onClick={(event) => handleCardClick(index, event)}
          >
            {/* En-tête avec le poste recherché */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 border-b border-emerald-100">
              <div className="space-y-2">
                {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
                  <div key={index}>
                    <div 
                      className="text-emerald-700 font-semibold hover:text-emerald-800 hover:underline cursor-pointer transition-colors text-sm leading-relaxed"
                      data-clickable="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (lead.url) window.open(lead.url, '_blank');
                      }}
                    >
                      {poste}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Badge 
                  variant="secondary" 
                  className="text-xs px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium"
                >
                  {lead.openai_step3_categorie}
                </Badge>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="p-4 space-y-4">
              {/* Section entreprise et poste du lead */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Entreprise & Poste du lead
                </div>
                
                {lead.unipile_company ? (
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div 
                          className="font-semibold text-blue-700 hover:text-blue-800 hover:underline cursor-pointer text-sm transition-colors"
                          data-clickable="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (lead.author_profile_url) window.open(lead.author_profile_url, '_blank');
                          }}
                        >
                          {lead.unipile_company}
                        </div>
                        {lead.author_profile_url && (
                          <a
                            href={lead.author_profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-clickable="true"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Linkedin className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {lead.unipile_position && (
                        <div className="text-slate-700 text-sm">
                          {lead.unipile_position}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-amber-700 font-medium text-sm">
                      Données non disponibles
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {lead.author_headline || 'N/A'}
                    </div>
                  </div>
                )}
              </div>

              {/* Section contact */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Contact
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-900 font-medium text-sm">
                    {lead.author_name || 'N/A'}
                  </span>
                  
                  {lead.author_profile_url && (
                    <a
                      href={lead.author_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-clickable="true"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-1 hover:bg-blue-50 rounded"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Footer avec détails */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Posté {getTimeAgo(lead.posted_at_iso || lead.created_at, lead.posted_at_timestamp)}
                </span>
                <span className="font-medium">
                  {lead.openai_step2_localisation || 'France'}
                </span>
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
