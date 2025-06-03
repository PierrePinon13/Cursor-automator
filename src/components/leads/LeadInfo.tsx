
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tables } from '@/integrations/supabase/types';
import CompanyHoverCard from './CompanyHoverCard';

type Lead = Tables<'leads'>;

interface LeadInfoProps {
  lead: Lead;
}

const LeadInfo = ({ lead }: LeadInfoProps) => {
  console.log('LeadInfo - lead data:', lead);
  console.log('LeadInfo - postes sélectionnés:', lead.openai_step3_postes_selectionnes);
  console.log('LeadInfo - text:', lead.text);
  console.log('LeadInfo - url:', lead.url);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Poste recherché - Mis en avant */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 shadow-sm border-2 border-green-200 flex-shrink-0">
        <h4 className="font-bold text-lg text-green-800 mb-3 flex items-center gap-2">
          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
          Poste recherché
        </h4>
        <div className="flex flex-wrap gap-2">
          {lead.openai_step3_postes_selectionnes && lead.openai_step3_postes_selectionnes.length > 0 ? (
            lead.openai_step3_postes_selectionnes.map((poste, index) => (
              <Badge 
                key={index} 
                className="bg-green-600 text-white border-green-700 hover:bg-green-700 transition-colors text-sm px-3 py-1"
              >
                {poste}
              </Badge>
            ))
          ) : (
            <span className="text-green-700 text-sm font-medium">Aucun poste sélectionné</span>
          )}
        </div>
      </div>

      {/* Entreprise - avec hover et lien */}
      {lead.company_name && (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex-shrink-0">
          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Entreprise
          </h4>
          <CompanyHoverCard 
            companyId={lead.company_id || undefined} 
            companyName={lead.company_name}
          >
            <div className="cursor-pointer group">
              <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors text-base">
                {lead.company_name}
              </p>
              {lead.company_position && (
                <p className="text-sm text-gray-600 mt-1">
                  {lead.company_position}
                </p>
              )}
              <p className="text-xs text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Cliquez pour voir le profil LinkedIn
              </p>
            </div>
          </CompanyHoverCard>
        </div>
      )}

      {/* Publication LinkedIn - utilise l'espace restant */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex-1 min-h-0">
        <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          Publication LinkedIn
        </h4>
        <div className="flex flex-col h-[calc(100%-32px)] space-y-3">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex-1 min-h-0">
            <ScrollArea className="h-full w-full">
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pr-4">
                {lead.text || 'Aucun texte disponible'}
              </div>
            </ScrollArea>
          </div>
          {lead.url && (
            <a
              href={lead.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline transition-colors flex-shrink-0"
            >
              Voir la publication
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadInfo;
