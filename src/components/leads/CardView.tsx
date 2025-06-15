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

const categoryColors = {
  'Tech': {
    card: 'bg-gradient-to-br from-blue-50/80 to-blue-100/60 border-blue-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-blue-100/80 to-blue-50/60 border-blue-200/60',
    badge: 'bg-blue-100/80 text-blue-800 border-blue-200/60'
  },
  'Business': {
    card: 'bg-gradient-to-br from-green-50/80 to-green-100/60 border-green-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-green-100/80 to-green-50/60 border-green-200/60',
    badge: 'bg-green-100/80 text-green-800 border-green-200/60'
  },
  'Product': {
    card: 'bg-gradient-to-br from-purple-50/80 to-purple-100/60 border-purple-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-purple-100/80 to-purple-50/60 border-purple-200/60',
    badge: 'bg-purple-100/80 text-purple-800 border-purple-200/60'
  },
  'Executive Search': {
    card: 'bg-gradient-to-br from-red-50/80 to-red-100/60 border-red-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-red-100/80 to-red-50/60 border-red-200/60',
    badge: 'bg-red-100/80 text-red-800 border-red-200/60'
  },
  'Comptelio': {
    card: 'bg-gradient-to-br from-yellow-50/80 to-yellow-100/60 border-yellow-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-yellow-100/80 to-yellow-50/60 border-yellow-200/60',
    badge: 'bg-yellow-100/80 text-yellow-800 border-yellow-200/60'
  },
  'RH': {
    card: 'bg-gradient-to-br from-pink-50/80 to-pink-100/60 border-pink-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-pink-100/80 to-pink-50/60 border-pink-200/60',
    badge: 'bg-pink-100/80 text-pink-800 border-pink-200/60'
  },
  'Freelance': {
    card: 'bg-gradient-to-br from-indigo-50/80 to-indigo-100/60 border-indigo-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-indigo-100/80 to-indigo-50/60 border-indigo-200/60',
    badge: 'bg-indigo-100/80 text-indigo-800 border-indigo-200/60'
  },
  'Data': {
    card: 'bg-gradient-to-br from-teal-50/80 to-teal-100/60 border-teal-200/60 backdrop-blur-sm',
    header: 'bg-gradient-to-r from-teal-100/80 to-teal-50/60 border-teal-200/60',
    badge: 'bg-teal-100/80 text-teal-800 border-teal-200/60'
  }
};

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

  const getCategoryColors = (category: string) => {
    return categoryColors[category as keyof typeof categoryColors] || {
      card: 'bg-gradient-to-br from-gray-50/80 to-gray-100/60 border-gray-200/60 backdrop-blur-sm',
      header: 'bg-gradient-to-r from-gray-100/80 to-gray-50/60 border-gray-200/60',
      badge: 'bg-gray-100/80 text-gray-800 border-gray-200/60'
    };
  };

  return (
    <>
      <div className="bg-gradient-to-br from-slate-50/20 to-gray-100/20 min-h-screen">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
          {leads.map((lead, index) => {
            const colors = getCategoryColors(lead.openai_step3_categorie || '');
            const postesCount = lead.openai_step3_postes_selectionnes?.length || 0;
            const fontSizeClass = postesCount > 2 ? 'text-xs' : postesCount > 1 ? 'text-sm' : 'text-sm';
            
            return (
              <div 
                key={lead.id} 
                className={`${colors.card} rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 hover:scale-[1.02] overflow-hidden flex flex-col min-h-[220px]`}
                onClick={(event) => handleCardClick(index, event)}
              >
                {/* En-tête avec gradient moderne */}
                <div className={`${colors.header} p-4 border-b min-h-[58px] flex items-center justify-between flex-shrink-0 backdrop-blur-sm`}>
                  <div className="flex-1 flex items-center min-h-0">
                    <div className="space-y-1 flex-1">
                      {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
                        <div key={index}>
                          <div 
                            className={`text-emerald-700 font-semibold hover:text-emerald-800 hover:underline cursor-pointer transition-colors ${fontSizeClass} leading-tight`}
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
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs px-3 py-1 ${colors.badge} border font-semibold backdrop-blur-sm`}
                    >
                      {lead.openai_step3_categorie}
                    </Badge>
                  </div>
                </div>

                {/* Section centrale modernisée */}
                <div className="p-4 space-y-3 flex-1 bg-white/20 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">
                      {lead.author_name || 'N/A'}
                    </span>
                    {lead.author_profile_url && (
                      <a
                        href={lead.author_profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-clickable="true"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg bg-blue-50/60 hover:bg-blue-100/60 transition-all duration-200 hover:scale-110"
                      >
                        <Linkedin className="h-4 w-4 text-blue-600" />
                      </a>
                    )}
                  </div>

                  {(lead.unipile_position || lead.company_position) && (
                    <div className="text-gray-700 text-sm font-medium bg-white/40 px-3 py-1 rounded-lg">
                      {lead.unipile_position || lead.company_position}
                    </div>
                  )}

                  {lead.unipile_company || lead.company_name ? (
                    <div 
                      className="text-blue-700 hover:text-blue-800 hover:underline cursor-pointer text-sm font-semibold transition-colors bg-blue-50/40 px-3 py-2 rounded-lg"
                      data-clickable="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (lead.author_profile_url) window.open(lead.author_profile_url, '_blank');
                      }}
                    >
                      {lead.unipile_company || lead.company_name}
                    </div>
                  ) : (
                    <div className="text-amber-600 text-sm font-medium bg-amber-50/40 px-3 py-2 rounded-lg">
                      Données non disponibles
                    </div>
                  )}
                </div>

                {/* Footer modernisé */}
                <div className="bg-white/30 backdrop-blur-sm px-4 py-3 border-t border-gray-200/40 flex-shrink-0">
                  <div className="flex items-center justify-between text-xs text-gray-700">
                    <span className="font-medium bg-white/40 px-2 py-1 rounded">
                      Posté {getTimeAgo(lead.posted_at_iso || lead.created_at, lead.posted_at_timestamp)}
                    </span>
                    <span className="font-semibold bg-emerald-50/60 text-emerald-700 px-2 py-1 rounded">
                      {lead.openai_step2_localisation || 'France'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
