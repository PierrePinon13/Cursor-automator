
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
    card: 'bg-blue-50 border-blue-200',
    header: 'bg-gradient-to-r from-blue-100 to-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  'Business': {
    card: 'bg-green-50 border-green-200',
    header: 'bg-gradient-to-r from-green-100 to-green-50 border-green-200',
    badge: 'bg-green-100 text-green-800 border-green-200'
  },
  'Product': {
    card: 'bg-purple-50 border-purple-200',
    header: 'bg-gradient-to-r from-purple-100 to-purple-50 border-purple-200',
    badge: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  'Executive Search': {
    card: 'bg-red-50 border-red-200',
    header: 'bg-gradient-to-r from-red-100 to-red-50 border-red-200',
    badge: 'bg-red-100 text-red-800 border-red-200'
  },
  'Comptelio': {
    card: 'bg-yellow-50 border-yellow-200',
    header: 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  'RH': {
    card: 'bg-pink-50 border-pink-200',
    header: 'bg-gradient-to-r from-pink-100 to-pink-50 border-pink-200',
    badge: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  'Freelance': {
    card: 'bg-indigo-50 border-indigo-200',
    header: 'bg-gradient-to-r from-indigo-100 to-indigo-50 border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  'Data': {
    card: 'bg-teal-50 border-teal-200',
    header: 'bg-gradient-to-r from-teal-100 to-teal-50 border-teal-200',
    badge: 'bg-teal-100 text-teal-800 border-teal-200'
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
      card: 'bg-gray-50 border-gray-200',
      header: 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-200',
      badge: 'bg-gray-100 text-gray-800 border-gray-200'
    };
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {leads.map((lead, index) => {
          const colors = getCategoryColors(lead.openai_step3_categorie || '');
          const postesCount = lead.openai_step3_postes_selectionnes?.length || 0;
          const fontSizeClass = postesCount > 2 ? 'text-xs' : postesCount > 1 ? 'text-sm' : 'text-sm';
          
          return (
            <div 
              key={lead.id} 
              className={`${colors.card} rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5 overflow-hidden`}
              onClick={(event) => handleCardClick(index, event)}
            >
              {/* En-tête avec hauteur fixe et postes centrés */}
              <div className={`${colors.header} p-3 border-b h-20 flex items-center justify-between`}>
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
                <div className="ml-2 flex-shrink-0">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs px-2 py-1 ${colors.badge} border font-medium`}
                  >
                    {lead.openai_step3_categorie}
                  </Badge>
                </div>
              </div>

              {/* Section centrale - Lead */}
              <div className="p-3 space-y-2">
                {/* Nom du lead avec LinkedIn */}
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
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Poste du lead */}
                {(lead.unipile_position || lead.company_position) && (
                  <div className="text-gray-600 text-sm">
                    {lead.unipile_position || lead.company_position}
                  </div>
                )}

                {/* Entreprise */}
                {lead.unipile_company || lead.company_name ? (
                  <div 
                    className="text-blue-700 hover:text-blue-800 hover:underline cursor-pointer text-sm font-medium transition-colors"
                    data-clickable="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (lead.author_profile_url) window.open(lead.author_profile_url, '_blank');
                    }}
                  >
                    {lead.unipile_company || lead.company_name}
                  </div>
                ) : (
                  <div className="text-amber-600 text-sm">
                    Données non disponibles
                  </div>
                )}
              </div>

              {/* Footer avec détails */}
              <div className="bg-white/50 px-3 py-2 border-t border-gray-200/50">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>
                    Posté {getTimeAgo(lead.posted_at_iso || lead.created_at, lead.posted_at_timestamp)}
                  </span>
                  <span className="font-medium">
                    {lead.openai_step2_localisation || 'France'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
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
