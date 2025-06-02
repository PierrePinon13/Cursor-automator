
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    <div className="flex flex-col h-full space-y-4">
      {/* Informations entreprise */}
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
            <div className="cursor-help">
              <p className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                {lead.company_name}
              </p>
              {lead.company_position && (
                <p className="text-sm text-gray-600 mt-1">
                  {lead.company_position}
                </p>
              )}
            </div>
          </CompanyHoverCard>
        </div>
      )}

      {/* Poste recherché */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex-shrink-0">
        <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Poste recherché
        </h4>
        <div className="flex flex-wrap gap-2">
          {lead.openai_step3_postes_selectionnes && lead.openai_step3_postes_selectionnes.length > 0 ? (
            lead.openai_step3_postes_selectionnes.map((poste, index) => (
              <Badge key={index} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors">
                {poste}
              </Badge>
            ))
          ) : (
            <span className="text-gray-500 text-sm">Aucun poste sélectionné</span>
          )}
        </div>
      </div>

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
