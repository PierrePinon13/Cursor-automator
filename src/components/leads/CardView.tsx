
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
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 overflow-hidden"
            onClick={(event) => handleCardClick(index, event)}
          >
            {/* Header avec date et localisation */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  {getTimeAgo(lead.posted_at_iso || lead.created_at, lead.posted_at_timestamp)}
                </span>
                <span className="text-slate-600 bg-white px-2 py-1 rounded-full font-medium border border-slate-200">
                  {lead.openai_step2_localisation || 'France'}
                </span>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="p-5 space-y-4">
              {/* Section 1: Profil recherché (priorité visuelle) */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
                <div className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">
                  Profil recherché
                </div>
                <div className="space-y-2">
                  {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
                    <div key={index}>
                      <span 
                        className="text-emerald-800 font-semibold hover:text-emerald-900 hover:underline cursor-pointer transition-colors inline-block text-sm leading-relaxed"
                        data-clickable="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (lead.url) window.open(lead.url, '_blank');
                        }}
                      >
                        {poste}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Entreprise et poste du lead */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                      Entreprise & Poste
                    </div>
                    {lead.unipile_company ? (
                      <div className="space-y-1">
                        <div 
                          className="font-semibold text-blue-900 hover:text-blue-800 hover:underline cursor-pointer text-sm transition-colors"
                          data-clickable="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (lead.author_profile_url) window.open(lead.author_profile_url, '_blank');
                          }}
                        >
                          {lead.unipile_company}
                        </div>
                        {lead.unipile_position && (
                          <div className="text-blue-700 text-sm font-medium">
                            {lead.unipile_position}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-amber-700 font-medium text-sm">
                          Données non disponibles
                        </div>
                        <div className="text-xs text-blue-600 truncate">
                          {lead.author_headline || 'N/A'}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Badge catégorie */}
                  <Badge 
                    variant="secondary" 
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-800 border border-blue-200 font-medium"
                  >
                    {lead.openai_step3_categorie}
                  </Badge>
                </div>
              </div>

              {/* Section 3: Informations du lead */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                <div className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                  Contact
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-900 font-medium text-sm">
                    {lead.author_name || 'N/A'}
                  </span>
                  
                  {lead.author_profile_url && (
                    <a
                      href={lead.author_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-clickable="true"
                      onClick={(e) => e.stopPropagation()}
                      className="text-purple-600 hover:text-purple-800 transition-colors p-1 hover:bg-purple-100 rounded"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                </div>
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
