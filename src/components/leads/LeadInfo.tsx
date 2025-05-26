
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Lead {
  author_name: string;
  author_profile_url: string;
  author_headline: string;
  unipile_company: string;
  unipile_position: string;
  openai_step3_postes_selectionnes: string[];
  text: string;
  url: string;
}

interface LeadInfoProps {
  lead: Lead;
}

const LeadInfo = ({ lead }: LeadInfoProps) => {
  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Poste recherché */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex-shrink-0">
        <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Poste recherché
        </h4>
        <div className="flex flex-wrap gap-2">
          {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
            <Badge key={index} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors">
              {poste}
            </Badge>
          ))}
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
                {lead.text}
              </div>
            </ScrollArea>
          </div>
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline transition-colors flex-shrink-0"
          >
            Voir la publication
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LeadInfo;
